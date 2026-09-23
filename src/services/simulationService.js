require('dotenv').config();
const axios = require('axios');
const { pool } = require('../database/db');
const config = require('../config');

const JPL_HORIZONS_BASE_URL = config.jpl.horizonsBaseUrl;
const JPL_SENTRY_BASE_URL = config.jpl.sentryBaseUrl;
const JPL_SBDB_BASE_URL = config.jpl.sbdbBaseUrl;
const TRAJECTORY_CACHE_TTL_HOURS = config.jpl.trajectoryCacheTtlHours;
const IMPACT_RISK_CACHE_TTL_HOURS = config.jpl.impactRiskCacheTtlHours;

const inFlightTrajectoryRequests = new Map();
const inFlightImpactRiskRequests = new Map();
const inFlightOrbitalElementsRequests = new Map();

async function getWithRetry(url) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try { return await axios.get(url, { timeout: 30000 }); } catch (error) { lastError = error; }
  }
  throw lastError;
}

async function queryTrajectoryCache(asteroidId) {
  const result = await pool.query(
    `SELECT tr.*, json_agg(tp ORDER BY tp.timestamp) FILTER (WHERE tp.id IS NOT NULL) as points
     FROM trajectory_runs tr
     LEFT JOIN trajectory_points tp ON tr.id = tp.trajectory_run_id
     WHERE tr.asteroid_id = $1
     AND tr.generated_at > NOW() - INTERVAL '${TRAJECTORY_CACHE_TTL_HOURS} hours'
     GROUP BY tr.id
     ORDER BY tr.generated_at DESC
     LIMIT 1`,
    [asteroidId]
  );
  return result.rows[0] || null;
}

async function storeTrajectoryRun(asteroidId, source, startTime, endTime, stepSize, points) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const runResult = await client.query(
      `INSERT INTO trajectory_runs (asteroid_id, source, start_time, end_time, step_size)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [asteroidId, source, startTime, endTime, stepSize]
    );
    const runId = runResult.rows[0].id;
    for (const point of points) {
      await client.query(
        `INSERT INTO trajectory_points (trajectory_run_id, timestamp, x, y, z, vx, vy, vz)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [runId, point.timestamp, point.x, point.y, point.z, point.vx, point.vy, point.vz]
      );
    }
    await client.query('COMMIT');
    return runId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function fetchTrajectoryFromHorizons(asteroidId) {
  const asteroidResult = await pool.query('SELECT name FROM asteroids WHERE id = $1', [asteroidId]);
  if (asteroidResult.rows.length === 0) {
    throw new Error('Asteroid not found');
  }
  const asteroidName = asteroidResult.rows[0].name;

  const now = new Date();
  const startTime = now.toISOString().split('T')[0];
  const endTime = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const params = {
    format: 'json',
    COMMAND: `'${asteroidName}'`,
    OBJ_DATA: 'NO',
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'VECTORS',
    CENTER: '@10',
    START_TIME: startTime,
    STOP_TIME: endTime,
    STEP_SIZE: '1 d',
    OUT_UNITS: 'KM-S',
    REF_PLANE: 'ECLIPTIC',
    REF_SYSTEM: 'J2000',
    VEC_TABLE: '2',
    CSV_FORMAT: 'YES',
  };

  const url = `${JPL_HORIZONS_BASE_URL}?${new URLSearchParams(params).toString()}`;

  const response = await getWithRetry(url);
  const data = response.data;

  if (data.result && data.result.includes('Error')) {
    throw new Error(`JPL Horizons error: ${data.result}`);
  }

  return parseHorizonsVectors(data, asteroidId);
}

function parseHorizonsVectors(data, asteroidId) {
  if (!data || typeof data.result !== 'string') throw new Error('Malformed JPL Horizons response');
  const points = [];
  const lines = data.result.split('\n');
  let inDataSection = false;

  for (const line of lines) {
    if (line.startsWith('$$SOE')) {
      inDataSection = true;
      continue;
    }
    if (line.startsWith('$$EOE')) {
      inDataSection = false;
      continue;
    }
    if (!inDataSection) continue;

    // CSV_FORMAT returns a calendar timestamp, Julian date, then vector fields.
    const parts = line.includes(',') ? line.split(',').map((part) => part.trim()) : line.trim().split(/\s+/);
    if (parts.length < 7) continue;

    const vectorOffset = parts.length >= 8 ? 2 : 1;
    const jdt = parseFloat(parts[vectorOffset - 1]);
    const x = parseFloat(parts[vectorOffset]); const y = parseFloat(parts[vectorOffset + 1]); const z = parseFloat(parts[vectorOffset + 2]);
    const vx = parseFloat(parts[vectorOffset + 3]); const vy = parseFloat(parts[vectorOffset + 4]); const vz = parseFloat(parts[vectorOffset + 5]);

    if (isNaN(jdt) || isNaN(x) || isNaN(y) || isNaN(z)) continue;

    const timestamp = Number.isFinite(jdt) ? jdToDate(jdt) : new Date(parts[0].replace('A.D. ', '').replace(' ', 'T') + 'Z').toISOString();

    points.push({ timestamp, x, y, z, vx, vy, vz });
  }

  if (points.length === 0) {
    throw new Error('No valid trajectory points parsed from Horizons response');
  }

  const startTime = points[0].timestamp;
  const endTime = points[points.length - 1].timestamp;
  const stepSize = calculateStepSize(points);

  return { asteroidId, source: 'JPL_HORIZONS', startTime, endTime, stepSize, points };
}

function jdToDate(jd) {
  const jdOffset = 2440587.5;
  const unixTime = (jd - jdOffset) * 86400 * 1000;
  return new Date(unixTime).toISOString();
}

function calculateStepSize(points) {
  if (points.length < 2) return '1 day';
  const diffMs = new Date(points[1].timestamp) - new Date(points[0].timestamp);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
}

async function fetchTrajectory(asteroidId) {
  const cached = await queryTrajectoryCache(asteroidId);
  if (cached && cached.points && cached.points.length > 0) {
    return { ...cached, source: 'JPL_HORIZONS', cached: true };
  }

  if (inFlightTrajectoryRequests.has(asteroidId)) {
    return inFlightTrajectoryRequests.get(asteroidId);
  }

  const promise = (async () => {
    try {
      const trajectoryData = await fetchTrajectoryFromHorizons(asteroidId);
      await storeTrajectoryRun(
        trajectoryData.asteroidId,
        trajectoryData.source,
        trajectoryData.startTime,
        trajectoryData.endTime,
        trajectoryData.stepSize,
        trajectoryData.points
      );
      return { ...trajectoryData, cached: false };
    } finally {
      inFlightTrajectoryRequests.delete(asteroidId);
    }
  })();

  inFlightTrajectoryRequests.set(asteroidId, promise);
  return promise;
}

async function queryImpactRiskCache(asteroidId) {
  const result = await pool.query(
    `SELECT * FROM impact_risk
     WHERE asteroid_id = $1
     AND retrieved_at > NOW() - INTERVAL '${IMPACT_RISK_CACHE_TTL_HOURS} hours'
     ORDER BY retrieved_at DESC
     LIMIT 1`,
    [asteroidId]
  );
  return result.rows[0] || null;
}

async function storeImpactRisk(asteroidId, riskData) {
  await pool.query(
    `INSERT INTO impact_risk (
       asteroid_id, source, impact_probability, impact_date_range,
       impact_energy, impact_velocity, palermo_scale, torino_scale,
       potential_impacts, raw_metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      asteroidId,
      riskData.source,
      riskData.impactProbability,
      riskData.impactDateRange,
      riskData.impactEnergy,
      riskData.impactVelocity,
      riskData.palermoScale,
      riskData.torinoScale,
      JSON.stringify(riskData.potentialImpacts),
      JSON.stringify(riskData.rawMetadata),
    ]
  );
}

async function fetchImpactRiskFromSentry(asteroidId) {
  const asteroidResult = await pool.query('SELECT name FROM asteroids WHERE id = $1', [asteroidId]);
  if (asteroidResult.rows.length === 0) {
    throw new Error('Asteroid not found');
  }
  const asteroidName = asteroidResult.rows[0].name;

  const params = {
    format: 'json',
    des: asteroidName,
  };

  const url = `${JPL_SENTRY_BASE_URL}?${new URLSearchParams(params).toString()}`;

  const response = await getWithRetry(url);
  const data = response.data;

  if (data.signature && data.signature.source && data.signature.source.includes('Sentry')) {
    if (!data.data || data.data.length === 0) {
      return {
        source: 'JPL_SENTRY',
        impactProbability: null,
        impactDateRange: null,
        impactEnergy: null,
        impactVelocity: null,
        palermoScale: null,
        torinoScale: null,
        potentialImpacts: [],
        rawMetadata: { message: 'No JPL Sentry assessment currently available' },
        hasAssessment: false,
      };
    }

    const impacts = data.data;
    const maxProbImpact = impacts.reduce((max, curr) => {
      const maxProb = parseFloat(max.ip || '0');
      const currProb = parseFloat(curr.ip || '0');
      return currProb > maxProb ? curr : max;
    }, impacts[0]);

    return {
      source: 'JPL_SENTRY',
      impactProbability: parseFloat(maxProbImpact.ip),
      impactDateRange: `${impacts[impacts.length - 1].date} to ${impacts[0].date}`,
      impactEnergy: parseFloat(maxProbImpact.energy),
      impactVelocity: parseFloat(maxProbImpact.v_inf),
      palermoScale: parseFloat(maxProbImpact.ps_cum),
      torinoScale: parseInt(maxProbImpact.ts || '0', 10),
      potentialImpacts: impacts.map(i => ({
        date: i.date,
        probability: parseFloat(i.ip),
        energy: parseFloat(i.energy),
        velocity: parseFloat(i.v_inf),
        palermoScale: parseFloat(i.ps_cum),
        torinoScale: parseInt(i.ts || '0', 10),
      })),
      rawMetadata: { signature: data.signature },
      hasAssessment: true,
    };
  }

  return {
    source: 'JPL_SENTRY',
    impactProbability: null,
    impactDateRange: null,
    impactEnergy: null,
    impactVelocity: null,
    palermoScale: null,
    torinoScale: null,
    potentialImpacts: [],
    rawMetadata: { message: 'No JPL Sentry assessment currently available' },
    hasAssessment: false,
  };
}

async function fetchImpactRisk(asteroidId) {
  const cached = await queryImpactRiskCache(asteroidId);
  if (cached) {
    return {
      ...cached,
      potentialImpacts: cached.potential_impacts || [],
      rawMetadata: cached.raw_metadata || {},
      hasAssessment: cached.impact_probability !== null,
      cached: true,
    };
  }

  if (inFlightImpactRiskRequests.has(asteroidId)) {
    return inFlightImpactRiskRequests.get(asteroidId);
  }

  const promise = (async () => {
    try {
      const riskData = await fetchImpactRiskFromSentry(asteroidId);
      await storeImpactRisk(asteroidId, riskData);
      return { ...riskData, cached: false };
    } finally {
      inFlightImpactRiskRequests.delete(asteroidId);
    }
  })();

  inFlightImpactRiskRequests.set(asteroidId, promise);
  return promise;
}

async function fetchOrbitalElements(asteroidId) {
  if (inFlightOrbitalElementsRequests.has(asteroidId)) {
    return inFlightOrbitalElementsRequests.get(asteroidId);
  }

  const promise = (async () => {
    try {
      const asteroidResult = await pool.query('SELECT name FROM asteroids WHERE id = $1', [asteroidId]);
      if (asteroidResult.rows.length === 0) {
        throw new Error('Asteroid not found');
      }
      const asteroidName = asteroidResult.rows[0].name;

      const params = {
        format: 'json',
        des: asteroidName,
      };

      const url = `${JPL_SBDB_BASE_URL}?${new URLSearchParams(params).toString()}`;
      const response = await getWithRetry(url);
      const data = response.data;

      if (data.object && data.object.orbit) {
        const orbit = data.object.orbit;
        return {
          source: 'JPL_SBDB',
          semiMajorAxis: parseFloat(orbit.a),
          eccentricity: parseFloat(orbit.e),
          inclination: parseFloat(orbit.i),
          longitudeOfAscendingNode: parseFloat(orbit.om),
          argumentOfPeriapsis: parseFloat(orbit.w),
          meanAnomaly: parseFloat(orbit.ma),
          epoch: orbit.epoch,
          period: parseFloat(orbit.per),
          rawMetadata: data,
        };
      }
      return { source: 'JPL_SBDB', message: 'No orbital elements available', rawMetadata: data };
    } finally {
      inFlightOrbitalElementsRequests.delete(asteroidId);
    }
  })();

  inFlightOrbitalElementsRequests.set(asteroidId, promise);
  return promise;
}

async function getSimulationData(asteroidId) {
  const asteroidResult = await pool.query('SELECT * FROM asteroids WHERE id = $1', [asteroidId]);
  if (asteroidResult.rows.length === 0) return null;
  const [approachesResult, trajectory, impactRisk, orbitalElements] = await Promise.all([
    pool.query('SELECT approach_date, velocity_kmh, miss_distance_km FROM close_approaches WHERE asteroid_id = $1 ORDER BY approach_date ASC', [asteroidId]),
    fetchTrajectory(asteroidId),
    fetchImpactRisk(asteroidId),
    fetchOrbitalElements(asteroidId).catch(() => ({ source: 'JPL_SBDB', message: 'Unavailable' })),
  ]);

  return {
    asteroid: asteroidResult.rows[0],
    closeApproaches: approachesResult.rows,
    trajectory,
    impactRisk,
    orbitalElements,
  };
}

module.exports = {
  fetchTrajectory,
  fetchImpactRisk,
  fetchOrbitalElements,
  getSimulationData,
};

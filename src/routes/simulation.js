const express = require('express');
const { pool } = require('../database/db');
const { fetchTrajectory, fetchImpactRisk, getSimulationData } = require('../services/simulationService');

const router = express.Router();

/**
 * GET /api/asteroids/:id/trajectory
 * Returns trajectory points for an asteroid from JPL Horizons (cached).
 */
router.get('/:id/trajectory', async (req, res) => {
  const asteroidId = req.params.id;

  try {
    const asteroidCheck = await pool.query('SELECT id FROM asteroids WHERE id = $1', [asteroidId]);
    if (asteroidCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Asteroid not found.' });
    }

    const trajectory = await fetchTrajectory(asteroidId);
    res.json({
      asteroid_id: asteroidId,
      source: trajectory.source,
      start_time: trajectory.startTime,
      end_time: trajectory.endTime,
      step_size: trajectory.stepSize,
      points: trajectory.points,
      cached: trajectory.cached,
    });
  } catch (err) {
    console.error(`Error fetching trajectory for asteroid ${asteroidId}:`, err);
    res.status(500).json({ error: 'Internal server error while fetching trajectory data.' });
  }
});

/**
 * GET /api/asteroids/:id/impact-risk
 * Returns impact risk assessment from JPL Sentry.
 */
router.get('/:id/impact-risk', async (req, res) => {
  const asteroidId = req.params.id;

  try {
    const asteroidCheck = await pool.query('SELECT id FROM asteroids WHERE id = $1', [asteroidId]);
    if (asteroidCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Asteroid not found.' });
    }

    const impactRisk = await fetchImpactRisk(asteroidId);
    res.json({
      asteroid_id: asteroidId,
      source: impactRisk.source,
      has_assessment: impactRisk.hasAssessment,
      impact_probability: impactRisk.impactProbability,
      impact_date_range: impactRisk.impactDateRange,
      impact_energy: impactRisk.impactEnergy,
      impact_velocity: impactRisk.impactVelocity,
      palermo_scale: impactRisk.palermoScale,
      torino_scale: impactRisk.torinoScale,
      potential_impacts: impactRisk.potentialImpacts,
      cached: impactRisk.cached,
    });
  } catch (err) {
    console.error(`Error fetching impact risk for asteroid ${asteroidId}:`, err);
    res.status(500).json({ error: 'Internal server error while fetching impact risk data.' });
  }
});

/**
 * GET /api/asteroids/:id/simulation
 * Bundles asteroid record, trajectory, and impact risk in one call.
 */
router.get('/:id/simulation', async (req, res) => {
  const asteroidId = req.params.id;

  try {
    const simulationData = await getSimulationData(asteroidId);

    if (!simulationData) {
      return res.status(404).json({ error: 'Asteroid not found.' });
    }

    res.json({
      asteroid: {
        id: simulationData.asteroid.id,
        name: simulationData.asteroid.name,
        absolute_magnitude: simulationData.asteroid.absolute_magnitude,
        estimated_diameter_max: simulationData.asteroid.estimated_diameter_max,
        is_hazardous: simulationData.asteroid.is_hazardous,
        custom_risk_score: simulationData.asteroid.custom_risk_score,
        size_class: simulationData.asteroid.size_class,
      },
      close_approaches: simulationData.closeApproaches,
      trajectory: simulationData.trajectory
        ? {
            source: simulationData.trajectory.source,
            start_time: simulationData.trajectory.startTime,
            end_time: simulationData.trajectory.endTime,
            step_size: simulationData.trajectory.stepSize,
            points: simulationData.trajectory.points,
            cached: simulationData.trajectory.cached,
          }
        : null,
      impact_risk: simulationData.impactRisk
        ? {
            source: simulationData.impactRisk.source,
            has_assessment: simulationData.impactRisk.hasAssessment,
            impact_probability: simulationData.impactRisk.impactProbability,
            impact_date_range: simulationData.impactRisk.impactDateRange,
            impact_energy: simulationData.impactRisk.impactEnergy,
            impact_velocity: simulationData.impactRisk.impactVelocity,
            palermo_scale: simulationData.impactRisk.palermoScale,
            torino_scale: simulationData.impactRisk.torinoScale,
            potential_impacts: simulationData.impactRisk.potentialImpacts,
            cached: simulationData.impactRisk.cached,
          }
        : null,
      orbital_elements: simulationData.orbitalElements || null,
    });
  } catch (err) {
    console.error(`Error fetching simulation data for asteroid ${asteroidId}:`, err);
    res.status(500).json({ error: 'Internal server error while fetching simulation data.' });
  }
});

module.exports = router;

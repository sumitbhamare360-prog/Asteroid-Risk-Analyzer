require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { pool } = require('../database/db');
const { calculateMetrics } = require('../utils/analyticsEngine');

/**
 * Fetches asteroid data either from the local seed file or the NASA NeoWs API.
 * @param {boolean} useSeedFile - If true, reads from the local JSON file.
 * @returns {Promise<Object>} - A promise that resolves to the raw asteroid data object.
 */
async function getAsteroidRawData(useSeedFile) {
  if (useSeedFile) {
    console.log('Using local seed data file...');
    const jsonPath = path.join(__dirname, '../data/nasa_seed_data.json');
    try {
      const rawData = fs.readFileSync(jsonPath, 'utf8');
      return JSON.parse(rawData);
    } catch (err) {
      console.error('Failed to read seed data file:', err);
      throw new Error('Could not read seed file.');
    }
  } else {
    console.log('Fetching live data from NASA NeoWs API...');
    const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
    if (apiKey === 'DEMO_KEY') {
      console.warn('WARNING: NASA_API_KEY not found in .env file. Using DEMO_KEY, which has rate limits.');
    }

    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    today.setDate(today.getDate() + 7);
    const endDate = today.toISOString().split('T')[0];
    
    const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${apiKey}`;

    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch data from NASA API:', error.response ? error.response.data : error.message);
      throw new Error('Could not fetch data from NASA API.');
    }
  }
}

async function syncAsteroidData(useSeedFile = false) {
  let data;
  try {
    data = await getAsteroidRawData(useSeedFile);
  } catch (err) {
    console.error(err.message);
    return;
  }
  
  const nearEarthObjects = data.near_earth_objects;
  
  // Get a dedicated client from the pool for the transaction
  const client = await pool.connect();
  let recordsProcessed = 0;

  try {
    await client.query('BEGIN');

    for (const dateKey in nearEarthObjects) {
      const asteroids = nearEarthObjects[dateKey];
      
      for (const ast of asteroids) {
        // Extract required fields
        const diameterMax = ast.estimated_diameter.meters.estimated_diameter_max;
        
        // We assume at least one close approach data object exists per asteroid based on the payload
        const approachData = ast.close_approach_data[0];
        const velocityKmh = parseFloat(approachData.relative_velocity.kilometers_per_hour);
        const missDistanceKm = parseFloat(approachData.miss_distance.kilometers);

        // Apply analytics engine
        const { sizeClass, riskScore } = calculateMetrics(diameterMax, velocityKmh, missDistanceKm);

        // 1. Upsert Asteroid record
        const upsertAsteroidQuery = `
          INSERT INTO asteroids (
            id, name, absolute_magnitude, estimated_diameter_max, 
            is_hazardous, custom_risk_score, size_class
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            absolute_magnitude = EXCLUDED.absolute_magnitude,
            estimated_diameter_max = EXCLUDED.estimated_diameter_max,
            is_hazardous = EXCLUDED.is_hazardous,
            custom_risk_score = EXCLUDED.custom_risk_score,
            size_class = EXCLUDED.size_class;
        `;
        
        await client.query(upsertAsteroidQuery, [
          ast.id,
          ast.name,
          ast.absolute_magnitude_h,
          diameterMax,
          ast.is_potentially_hazardous_asteroid,
          riskScore,
          sizeClass
        ]);

        // 2. Insert Close Approach record
        const insertApproachQuery = `
          INSERT INTO close_approaches (
            asteroid_id, approach_date, velocity_kmh, miss_distance_km
          ) VALUES ($1, $2, $3, $4);
        `;
        
        // To avoid duplicate close_approach entries on re-sync, we could add a check
        // but for this implementation, we'll insert as new. For a production app,
        // a composite primary key on (asteroid_id, approach_date) would be better.
        await client.query(insertApproachQuery, [
          ast.id,
          approachData.close_approach_date,
          velocityKmh,
          missDistanceKm
        ]);

        recordsProcessed++;
      }
    }

    // 3. Log Success
    await client.query(`
      INSERT INTO sync_logs (records_processed, status)
      VALUES ($1, $2)
    `, [recordsProcessed, 'SUCCESS']);

    // Commit transaction
    await client.query('COMMIT');
    console.log(`Sync completed successfully. Processed ${recordsProcessed} records.`);

  } catch (err) {
    // Rollback transaction on failure
    await client.query('ROLLBACK');
    console.error('Error occurred during synchronization. Transaction rolled back.', err);
    
    try {
      // 4. Log Failure
      await pool.query(`
        INSERT INTO sync_logs (records_processed, status)
        VALUES ($1, $2)
      `, [recordsProcessed, 'FAILED']);
      console.log('Failure logged to sync_logs.');
    } catch (logErr) {
      console.error('Failed to write failure log to database:', logErr);
    }
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}

module.exports = {
  syncAsteroidData
};

if (require.main === module) {
  const useSeed = process.argv.includes('--seed');
  syncAsteroidData(useSeed)
    .then(() => {
      console.log('Sync process finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Unhandled error during sync:', err);
      process.exit(1);
    });
}

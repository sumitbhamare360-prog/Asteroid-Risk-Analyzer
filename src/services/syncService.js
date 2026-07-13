const fs = require('fs');
const path = require('path');
const { pool } = require('../database/db');
const { calculateMetrics } = require('../utils/analyticsEngine');

async function syncAsteroidData() {
  const jsonPath = path.join(__dirname, '../data/nasa_seed_data.json');
  let rawData;
  
  try {
    rawData = fs.readFileSync(jsonPath, 'utf8');
  } catch (err) {
    console.error('Failed to read seed data file:', err);
    return;
  }

  const data = JSON.parse(rawData);
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
    console.log(`Sync completed successfully. Processed ${recordsProcessed} asteroids.`);

  } catch (err) {
    // Rollback transaction on failure
    await client.query('ROLLBACK');
    console.error('Error occurred during synchronization. Transaction rolled back.', err);
    
    try {
      // 4. Log Failure (using the main pool, as the transaction client might be compromised or rolling back)
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
  syncAsteroidData()
    .then(() => {
      console.log('Sync process finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Unhandled error during sync:', err);
      process.exit(1);
    });
}

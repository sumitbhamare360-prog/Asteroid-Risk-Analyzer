const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { pool } = require('./database/db');

const app = express();
const PORT = config.server.port;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting - apply to all API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false, 
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api', apiLimiter);

// ==========================================
// REST API Endpoints
// ==========================================

/**
 * GET /api/dashboard/stats
 * Returns overall statistics for the AstraGuard dashboard.
 */
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const totalAsteroidsQuery = pool.query('SELECT COUNT(*) FROM asteroids');
    const totalHazardousQuery = pool.query('SELECT COUNT(*) FROM asteroids WHERE is_hazardous = true');
    const highestRiskQuery = pool.query('SELECT * FROM asteroids ORDER BY custom_risk_score DESC LIMIT 1');

    // Execute queries concurrently for better performance
    const [totalAsteroidsResult, totalHazardousResult, highestRiskResult] = await Promise.all([
      totalAsteroidsQuery,
      totalHazardousQuery,
      highestRiskQuery
    ]);

    res.json({
      total_asteroids: parseInt(totalAsteroidsResult.rows[0].count, 10),
      total_hazardous: parseInt(totalHazardousResult.rows[0].count, 10),
      highest_risk: highestRiskResult.rows[0] || null
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Internal server error while fetching dashboard stats.' });
  }
});

/**
 * GET /api/asteroids
 * Returns a list of all asteroids joined with their latest close approach data.
 * Ordered by approach_date ASC.
 */
app.get('/api/asteroids', async (req, res) => {
  try {
    // We use a subquery with DISTINCT ON to get the latest close approach for each asteroid,
    // then we sort the final result set by approach_date ASC.
    const query = `
      SELECT * FROM (
        SELECT DISTINCT ON (a.id) 
          a.id, a.name, a.absolute_magnitude, a.estimated_diameter_max, 
          a.is_hazardous, a.custom_risk_score, a.size_class,
          c.approach_date, c.velocity_kmh, c.miss_distance_km
        FROM asteroids a
        JOIN close_approaches c ON a.id = c.asteroid_id
        ORDER BY a.id, c.approach_date DESC
      ) AS latest_approaches
      ORDER BY approach_date ASC;
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching asteroids list:', err);
    res.status(500).json({ error: 'Internal server error while fetching asteroids list.' });
  }
});

/**
 * GET /api/asteroids/:id
 * Returns the full profile for a single asteroid, including an array of historical close approaches.
 */
app.get('/api/asteroids/:id', async (req, res) => {
  const asteroidId = req.params.id;
  
  try {
    const asteroidResult = await pool.query('SELECT * FROM asteroids WHERE id = $1', [asteroidId]);
    
    if (asteroidResult.rows.length === 0) {
      return res.status(404).json({ error: 'Asteroid not found.' });
    }

    const approachesResult = await pool.query(
      'SELECT approach_date, velocity_kmh, miss_distance_km FROM close_approaches WHERE asteroid_id = $1 ORDER BY approach_date ASC', 
      [asteroidId]
    );

    const asteroid = asteroidResult.rows[0];
    asteroid.close_approaches = approachesResult.rows;

    res.json(asteroid);
  } catch (err) {
    console.error(`Error fetching asteroid profile for ID ${asteroidId}:`, err);
    res.status(500).json({ error: 'Internal server error while fetching asteroid details.' });
  }
});

// Start the server if running this file directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`AstraGuard API Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;

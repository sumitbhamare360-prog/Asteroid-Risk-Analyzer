const request = require('supertest');
const app = require('../server');

// Mock the database pool
jest.mock('../database/db', () => {
  const mockPool = {
    query: jest.fn(),
  };
  return {
    pool: mockPool,
  };
});

// Mock the simulation service
jest.mock('../services/simulationService', () => ({
  fetchTrajectory: jest.fn(),
  fetchImpactRisk: jest.fn(),
  getSimulationData: jest.fn(),
}));

const { pool } = require('../database/db');
const { fetchTrajectory, fetchImpactRisk, getSimulationData } = require('../services/simulationService');

describe('Simulation Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/asteroids/:id/trajectory', () => {
    it('should return trajectory data on happy path', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: '123' }] });
      fetchTrajectory.mockResolvedValue({
        source: 'JPL_HORIZONS',
        startTime: '2026-09-12T00:00:00.000Z',
        endTime: '2027-09-12T00:00:00.000Z',
        stepSize: '1 day',
        points: [
          { timestamp: '2026-09-12T00:00:00.000Z', x: 1, y: 2, z: 3, vx: 0.1, vy: 0.2, vz: 0.3 },
          { timestamp: '2026-09-13T00:00:00.000Z', x: 4, y: 5, z: 6, vx: 0.4, vy: 0.5, vz: 0.6 },
        ],
        cached: false,
      });

      const res = await request(app).get('/api/asteroids/123/trajectory');

      expect(res.statusCode).toEqual(200);
      expect(res.body.asteroid_id).toBe('123');
      expect(res.body.source).toBe('JPL_HORIZONS');
      expect(res.body.points).toHaveLength(2);
      expect(res.body.cached).toBe(false);
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(fetchTrajectory).toHaveBeenCalledWith('123');
    });

    it('should return 404 for an unknown asteroid', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const res = await request(app).get('/api/asteroids/unknown/trajectory');

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toBe('Asteroid not found.');
      expect(fetchTrajectory).not.toHaveBeenCalled();
    });

    it('should return 500 if fetchTrajectory throws', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: '123' }] });
      fetchTrajectory.mockRejectedValue(new Error('JPL API down'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app).get('/api/asteroids/123/trajectory');

      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toContain('Internal server error');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('GET /api/asteroids/:id/impact-risk', () => {
    it('should return impact risk assessment on happy path', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: '456' }] });
      fetchImpactRisk.mockResolvedValue({
        source: 'JPL_SENTRY',
        hasAssessment: true,
        impactProbability: 0.00012,
        impactDateRange: '2070-05-10 to 2070-05-10',
        impactEnergy: 250.5,
        impactVelocity: 18.2,
        palermoScale: -3.5,
        torinoScale: 1,
        potentialImpacts: [
          { date: '2070-05-10', probability: 0.00012, energy: 250.5, velocity: 18.2, palermoScale: -3.5, torinoScale: 1 },
        ],
        cached: true,
      });

      const res = await request(app).get('/api/asteroids/456/impact-risk');

      expect(res.statusCode).toEqual(200);
      expect(res.body.asteroid_id).toBe('456');
      expect(res.body.source).toBe('JPL_SENTRY');
      expect(res.body.has_assessment).toBe(true);
      expect(res.body.impact_probability).toBe(0.00012);
      expect(res.body.torino_scale).toBe(1);
      expect(res.body.potential_impacts).toHaveLength(1);
      expect(res.body.cached).toBe(true);
    });

    it('should return 404 for an unknown asteroid', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const res = await request(app).get('/api/asteroids/unknown/impact-risk');

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toBe('Asteroid not found.');
      expect(fetchImpactRisk).not.toHaveBeenCalled();
    });

    it('should return 500 if fetchImpactRisk throws', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: '456' }] });
      fetchImpactRisk.mockRejectedValue(new Error('Sentry API error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app).get('/api/asteroids/456/impact-risk');

      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toContain('Internal server error');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('GET /api/asteroids/:id/simulation', () => {
    it('should return bundled simulation data on happy path', async () => {
      getSimulationData.mockResolvedValue({
        asteroid: {
          id: '789',
          name: 'Test Asteroid',
          absolute_magnitude: '20.5',
          estimated_diameter_max: '250.3',
          is_hazardous: true,
          custom_risk_score: '5.2',
          size_class: 'Large',
        },
        trajectory: {
          source: 'JPL_HORIZONS',
          startTime: '2026-09-12T00:00:00.000Z',
          endTime: '2027-09-12T00:00:00.000Z',
          stepSize: '1 day',
          points: [{ timestamp: '2026-09-12T00:00:00.000Z', x: 1, y: 2, z: 3 }],
          cached: false,
        },
        impactRisk: {
          source: 'JPL_SENTRY',
          hasAssessment: true,
          impactProbability: 0.0005,
          impactDateRange: '2080-01-01',
          impactEnergy: 500,
          impactVelocity: 20,
          palermoScale: -2.1,
          torinoScale: 0,
          potentialImpacts: [],
          cached: true,
        },
        orbitalElements: {
          source: 'JPL_SBDB',
          semiMajorAxis: 2.3,
          eccentricity: 0.5,
          inclination: 10.5,
        },
      });

      const res = await request(app).get('/api/asteroids/789/simulation');

      expect(res.statusCode).toEqual(200);
      expect(res.body.asteroid.id).toBe('789');
      expect(res.body.asteroid.name).toBe('Test Asteroid');
      expect(res.body.trajectory.source).toBe('JPL_HORIZONS');
      expect(res.body.trajectory.points).toHaveLength(1);
      expect(res.body.impact_risk.source).toBe('JPL_SENTRY');
      expect(res.body.impact_risk.impact_probability).toBe(0.0005);
      expect(res.body.orbital_elements.semiMajorAxis).toBe(2.3);
    });

    it('should return 404 when getSimulationData returns null', async () => {
      getSimulationData.mockResolvedValue(null);

      const res = await request(app).get('/api/asteroids/nonexistent/simulation');

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toBe('Asteroid not found.');
    });

    it('should return 500 if getSimulationData throws', async () => {
      getSimulationData.mockRejectedValue(new Error('Database connection failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app).get('/api/asteroids/789/simulation');

      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toContain('Internal server error');

      consoleErrorSpy.mockRestore();
    });
  });
});
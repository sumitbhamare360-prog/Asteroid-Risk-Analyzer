const request = require('supertest');
const app = require('../server');
const { pool } = require('../database/db');

// Mock the 'pg' module
jest.mock('../database/db', () => {
  const mockPool = {
    query: jest.fn(),
  };
  return {
    pool: mockPool,
  };
});

describe('API Endpoints', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/asteroids', () => {
    it('should return a list of asteroids on happy path', async () => {
      const mockAsteroids = [
        { id: '1', name: 'Test Asteroid 1', approach_date: '2026-08-01' },
        { id: '2', name: 'Test Asteroid 2', approach_date: '2026-08-02' },
      ];
      pool.query.mockResolvedValue({ rows: mockAsteroids });

      const res = await request(app).get('/api/asteroids');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('Test Asteroid 1');
      expect(pool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/asteroids/:id', () => {
    it('should return a single asteroid with its close approaches', async () => {
      const mockAsteroid = { id: '123', name: 'Specific Asteroid' };
      const mockApproaches = [{ approach_date: '2026-09-01', velocity_kmh: '50000' }];
      
      pool.query
        .mockResolvedValueOnce({ rows: [mockAsteroid] }) // First call for asteroid
        .mockResolvedValueOnce({ rows: mockApproaches }); // Second call for approaches

      const res = await request(app).get('/api/asteroids/123');

      expect(res.statusCode).toEqual(200);
      expect(res.body.name).toBe('Specific Asteroid');
      expect(res.body.close_approaches).toHaveLength(1);
      expect(res.body.close_approaches[0].velocity_kmh).toBe('50000');
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('should return 404 for an unknown asteroid id', async () => {
      // Mock an empty result set for the asteroid query
      pool.query.mockResolvedValue({ rows: [] });

      const res = await request(app).get('/api/asteroids/unknown-id');

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toBe('Asteroid not found.');
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('should return 500 if there is a database error', async () => {
      // Suppress console.error for this specific test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      pool.query.mockRejectedValue(new Error('DB Error'));

      const res = await request(app).get('/api/asteroids');
      
      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toContain('Internal server error');

      // Restore original console.error
      consoleErrorSpy.mockRestore();
    });
  });
});

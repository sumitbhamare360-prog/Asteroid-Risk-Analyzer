const { calculateMetrics } = require('./analyticsEngine');

describe('analyticsEngine', () => {
  describe('calculateMetrics', () => {

    // Test cases for Size Class
    test('should classify a small asteroid (diameter < 50m) as "Small"', () => {
      const { sizeClass } = calculateMetrics(49, 50000, 10000000);
      expect(sizeClass).toBe('Small');
    });

    test('should classify a medium asteroid (diameter >= 50m and <= 500m) as "Medium"', () => {
      const { sizeClass: sizeClassLower } = calculateMetrics(50, 50000, 10000000);
      const { sizeClass: sizeClassUpper } = calculateMetrics(500, 50000, 10000000);
      expect(sizeClassLower).toBe('Medium');
      expect(sizeClassUpper).toBe('Medium');
    });

    test('should classify a massive asteroid (diameter > 500m) as "Massive"', () => {
      const { sizeClass } = calculateMetrics(501, 50000, 10000000);
      expect(sizeClass).toBe('Massive');
    });

    // Test cases for Risk Score
    test('should return a low risk score for a small, slow, and distant object', () => {
      // Small diameter, low velocity, large miss distance
      const { riskScore } = calculateMetrics(20, 10000, 50000000);
      expect(riskScore).toBeLessThan(1.0);
    });
    
    test('should return a high risk score for a large, fast, and close object', () => {
      // Large diameter, high velocity, small miss distance
      const { riskScore } = calculateMetrics(800, 90000, 150000);
      expect(riskScore).toBeGreaterThan(8.0);
    });

    test('should return a moderate risk score for an average object', () => {
      // Using the reference values from the implementation comments
      // D=1000, V=50000, P=5,000,000 -> D_f=1, V_f=1, P_f=~2 -> raw=5 -> final ~5
      const { riskScore } = calculateMetrics(1000, 50000, 5000000);
      expect(riskScore).toBeCloseTo(4.90, 1);
    });

    test('should cap the risk score at 10.00 for an extremely high-risk object', () => {
      // Massive diameter, extreme velocity, very close miss distance
      const { riskScore } = calculateMetrics(2000, 200000, 1000);
      expect(riskScore).toBe(10.00);
    });

    test('should handle zero miss distance without crashing and produce a high score', () => {
        const { riskScore } = calculateMetrics(500, 70000, 0);
        expect(riskScore).toBeGreaterThan(9.0);
        expect(riskScore).toBeLessThanOrEqual(10.0);
    });
  });
});

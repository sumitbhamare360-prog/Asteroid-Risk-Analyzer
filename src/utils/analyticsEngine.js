/**
 * Calculates analytics metrics for an asteroid.
 * 
 * @param {number} diameterMax - Maximum estimated diameter in meters
 * @param {number} velocityKmh - Relative velocity in km/h
 * @param {number} missDistanceKm - Miss distance in km
 * @returns {Object} Object containing sizeClass and riskScore
 */
function calculateMetrics(diameterMax, velocityKmh, missDistanceKm) {
  // --- Size Class Logic ---
  let sizeClass = 'Medium';
  if (diameterMax < 50) {
    sizeClass = 'Small';
  } else if (diameterMax > 500) {
    sizeClass = 'Massive';
  }

  // --- Risk Score Logic ---
  // We want the risk to be higher when:
  // 1. Diameter is large (more mass/damage potential)
  // 2. Velocity is high (more kinetic energy)
  // 3. Miss distance is small (closer to Earth)
  //
  // D_factor: normalizes diameter. 1000m diameter yields a factor of 1.0.
  // V_factor: normalizes velocity. 50,000 km/h yields a factor of 1.0.
  // P_factor (Proximity): inversely proportional to miss distance. 
  //   We add 100,000 to the denominator to prevent division by zero and extreme asymptotic spikes.
  //   A miss distance of 5,000,000 km yields a factor of roughly 2.0.
  
  const D_factor = diameterMax / 1000;
  const V_factor = velocityKmh / 50000;
  const P_factor = 10000000 / (missDistanceKm + 100000);

  // Raw score multiplies these factors. We multiply by 2.5 as a tuning constant
  // so average-risk asteroids land in the middle of the 0-10 scale.
  let rawScore = D_factor * V_factor * P_factor * 2.5;

  // Clamp the final score strictly between 0.00 and 10.00
  let riskScore = Math.max(0.0, Math.min(10.0, rawScore));

  return {
    sizeClass,
    riskScore: parseFloat(riskScore.toFixed(2))
  };
}

module.exports = {
  calculateMetrics
};

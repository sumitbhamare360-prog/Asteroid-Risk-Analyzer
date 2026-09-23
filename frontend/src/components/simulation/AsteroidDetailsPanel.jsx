import React from 'react';
import RiskBadge from '../RiskBadge';

const AsteroidDetailsPanel = ({ asteroid, trajectory, impactRisk, orbitalElements, closeApproaches }) => {
  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined) return 'N/A';
    return parseFloat(num).toLocaleString(undefined, { maximumFractionDigits: decimals });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getSourceBadge = (source) => {
    const colors = {
      'NASA_NEOWS': 'var(--accent-cyan)',
      'JPL_HORIZONS': 'var(--accent-amber)',
      'JPL_SENTRY': '#ff8800',
      'JPL_SBDB': '#00ff00',
      'ASTRAGUARD_DERIVED': '#8888ff',
    };
    return (
      <span style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: 'bold',
        backgroundColor: colors[source] || 'var(--text-muted)',
        color: '#000',
        marginLeft: '8px',
      }}>
        {source}
      </span>
    );
  };

  return (
    <div style={{ padding: '20px', maxHeight: 'calc(100% - 140px)', overflowY: 'auto' }}>
      <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid var(--border-color)' }}>
        <h3 style={{ margin: '0 0 10px 0', color: 'var(--accent-cyan)', fontSize: '1.1rem' }}>
          {asteroid?.name || 'Unknown Asteroid'}
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span>ID: {asteroid?.id}</span>
          <span>Diameter: {formatNumber(asteroid?.estimated_diameter_max)} m</span>
          <span>H: {asteroid?.absolute_magnitude}</span>
        </div>
      </div>

      <section style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          OBJECT
          {getSourceBadge('NASA_NEOWS')}
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
          <div><strong>Name:</strong> {asteroid?.name}</div>
          <div><strong>ID:</strong> {asteroid?.id}</div>
          <div><strong>Absolute Magnitude:</strong> {asteroid?.absolute_magnitude}</div>
          <div><strong>Max Diameter:</strong> {formatNumber(asteroid?.estimated_diameter_max)} m</div>
          <div><strong>Hazardous:</strong> {asteroid?.is_hazardous ? 'Yes' : 'No'}</div>
        </div>
      </section>

      <section style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ORBIT
          {orbitalElements?.source && getSourceBadge(orbitalElements.source)}
        </h4>
        {orbitalElements?.semiMajorAxis ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
            <div><strong>Semi-major Axis:</strong> {formatNumber(orbitalElements.semiMajorAxis)} AU</div>
            <div><strong>Eccentricity:</strong> {formatNumber(orbitalElements.eccentricity, 4)}</div>
            <div><strong>Inclination:</strong> {formatNumber(orbitalElements.inclination, 2)}°</div>
            <div><strong>Long. Asc. Node:</strong> {formatNumber(orbitalElements.longitudeOfAscendingNode, 2)}°</div>
            <div><strong>Arg. Periapsis:</strong> {formatNumber(orbitalElements.argumentOfPeriapsis, 2)}°</div>
            <div><strong>Mean Anomaly:</strong> {formatNumber(orbitalElements.meanAnomaly, 2)}°</div>
            <div><strong>Period:</strong> {formatNumber(orbitalElements.period, 2)} days</div>
            <div><strong>Epoch:</strong> {orbitalElements.epoch}</div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Orbital elements not available (JPL SBDB query failed or no data)</p>
        )}
      </section>

      <section style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          CLOSE APPROACH HISTORY
          {getSourceBadge('NASA_NEOWS')}
        </h4>
        {closeApproaches && closeApproaches.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Velocity (km/h)</th>
                  <th style={thStyle}>Miss Distance (km)</th>
                </tr>
              </thead>
              <tbody>
                {closeApproaches.slice(0, 10).map((ca, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={tdStyle}>{formatDate(ca.approach_date)}</td>
                    <td style={tdStyle}>{formatNumber(ca.velocity_kmh)}</td>
                    <td style={tdStyle}>{formatNumber(ca.miss_distance_km)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {closeApproaches.length > 10 && (
              <p style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Showing 10 of {closeApproaches.length} approaches
              </p>
            )}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No close approach data available</p>
        )}
      </section>

      <section style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          IMPACT ASSESSMENT
          {impactRisk?.source && getSourceBadge(impactRisk.source)}
        </h4>
        {impactRisk?.has_assessment ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
            <div><strong>Impact Probability:</strong> {(impactRisk.impact_probability * 100).toExponential(2)}%</div>
            <div><strong>Date Range:</strong> {impactRisk.impact_date_range}</div>
            <div><strong>Impact Energy:</strong> {formatNumber(impactRisk.impact_energy)} MT</div>
            <div><strong>Impact Velocity:</strong> {formatNumber(impactRisk.impact_velocity)} km/s</div>
            <div><strong>Palermo Scale:</strong> {formatNumber(impactRisk.palermo_scale, 2)}</div>
            <div><strong>Torino Scale:</strong> {impactRisk.torino_scale}</div>
          </div>
        ) : (
          <div style={{ padding: '15px', backgroundColor: 'rgba(255, 191, 0, 0.1)', border: '1px solid var(--accent-amber)', borderRadius: '4px' }}>
            <p style={{ margin: 0, color: 'var(--accent-amber)', fontSize: '0.85rem' }}>
              <strong>No JPL Sentry assessment currently available</strong> for this asteroid.
              This does not mean zero risk — it means JPL has not published a formal impact assessment.
            </p>
          </div>
        )}
      </section>

      <section style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ASTRAGUARD ANALYTICS
          {getSourceBadge('ASTRAGUARD_DERIVED')}
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
              <strong>Custom Risk Score:</strong>
              <RiskBadge score={asteroid?.custom_risk_score} />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Derived from diameter, velocity, and miss distance using AstraGuard's analytics engine.
            </div>
          </div>
          <div>
            <strong>Size Class:</strong>
            <span style={{ marginLeft: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)' }}>
              {asteroid?.size_class}
            </span>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>
              Classification based on estimated maximum diameter (Small {'<'} 50m, Medium 50-500m, Massive {'>'} 500m).
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const thStyle = {
  padding: '8px',
  textAlign: 'left',
  color: 'var(--text-muted)',
  fontWeight: '500',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
};

const tdStyle = {
  padding: '8px',
  color: 'var(--text-main)',
};

export default AsteroidDetailsPanel;
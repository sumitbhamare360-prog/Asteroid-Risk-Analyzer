import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import RiskBadge from './RiskBadge';

const AsteroidDetailModal = ({ asteroidId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!asteroidId) return;
    
    const fetchAsteroidDetails = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/asteroids/${asteroidId}`);
        setData(res.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch asteroid details.');
        setLoading(false);
      }
    };
    fetchAsteroidDetails();
  }, [asteroidId]);

  if (!asteroidId) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <div style={modalHeaderStyle}>
          <h2 style={{ margin: 0, color: 'var(--accent-cyan)' }}>
            {data ? data.name : 'Loading...'}
          </h2>
          <button onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="loading-spinner"></div>
          </div>
        )}

        {error && (
          <div className="error-boundary" style={{ margin: '20px' }}>
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        )}

        {data && !loading && !error && (
          <div style={{ padding: '20px', overflowY: 'auto', maxHeight: '70vh' }}>
            
            <div style={statsGridStyle}>
              <div className="metric-card" style={smallCardStyle}>
                <h3 style={labelStyle}>Size Class</h3>
                <p className="value" style={{ color: 'var(--text-main)' }}>{data.size_class}</p>
              </div>
              <div className="metric-card" style={smallCardStyle}>
                <h3 style={labelStyle}>Risk Score</h3>
                <div style={{ marginTop: '5px' }}>
                  <RiskBadge score={data.custom_risk_score} />
                </div>
              </div>
              <div className="metric-card" style={smallCardStyle}>
                <h3 style={labelStyle}>Abs. Magnitude</h3>
                <p className="value" style={{ color: 'var(--text-main)' }}>{data.absolute_magnitude}</p>
              </div>
              <div className="metric-card" style={smallCardStyle}>
                <h3 style={labelStyle}>Est. Diameter (max)</h3>
                <p className="value" style={{ color: 'var(--text-main)' }}>
                  {parseFloat(data.estimated_diameter_max).toLocaleString(undefined, { maximumFractionDigits: 2 })}m
                </p>
              </div>
            </div>

            <div className="list-section" style={{ marginTop: '20px', padding: '15px' }}>
              <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>Close Approaches History</h3>
              {data.close_approaches && data.close_approaches.length > 0 ? (
                <div style={{ overflowX: 'auto', maxHeight: '250px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-panel)' }}>
                      <tr>
                        <th style={thStyle}>Date</th>
                        <th style={thStyle}>Velocity (km/h)</th>
                        <th style={thStyle}>Miss Distance (km)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.close_approaches.map((ca, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={tdStyle}>{ca.approach_date}</td>
                          <td style={tdStyle}>{parseFloat(ca.velocity_kmh).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td style={tdStyle}>{parseFloat(ca.miss_distance_km).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No historical approach data found.</p>
              )}
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
};

// Simple inline styles for modal, could be moved to index.css
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(4px)'
};

const modalContentStyle = {
  backgroundColor: 'var(--bg-dark)',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  width: '90%',
  maxWidth: '700px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
};

const modalHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '15px 20px',
  borderBottom: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-panel)',
  borderTopLeftRadius: '8px',
  borderTopRightRadius: '8px'
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: '1.5rem',
  cursor: 'pointer',
  lineHeight: 1
};

const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '15px'
};

const smallCardStyle = {
  padding: '15px',
  gap: '5px'
};

const labelStyle = {
  margin: 0,
  fontSize: '0.8rem',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const thStyle = {
  padding: '10px',
  borderBottom: '1px solid var(--border-color)',
  color: 'var(--text-muted)',
  fontWeight: '500'
};

const tdStyle = {
  padding: '10px'
};

export default AsteroidDetailModal;

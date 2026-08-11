import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import AsteroidDetailModal from './AsteroidDetailModal';
import RiskBadge from './RiskBadge';

const AsteroidCatalog = () => {
  const [asteroids, setAsteroids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [hazardousOnly, setHazardousOnly] = useState(false);

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'approach_date', direction: 'asc' });

  // Modal state
  const [selectedAsteroidId, setSelectedAsteroidId] = useState(null);

  useEffect(() => {
    const fetchAsteroids = async () => {
      try {
        setLoading(true);
        const res = await api.get('/asteroids');
        setAsteroids(res.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch asteroids list.');
        setLoading(false);
      }
    };
    fetchAsteroids();
  }, []);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredAsteroids = useMemo(() => {
    // 1. Filter
    let filtered = asteroids.filter(ast => {
      if (hazardousOnly && !ast.is_hazardous) return false;
      if (searchTerm && !ast.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

    // 2. Sort
    filtered.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [asteroids, searchTerm, hazardousOnly, sortConfig]);

  if (loading) {
    return <div style={{ textAlign: 'center' }}><div className="loading-spinner"></div></div>;
  }

  if (error) {
    return <div className="error-boundary"><h3>Connection Error</h3><p>{error}</p></div>;
  }

  return (
    <div className="list-section" style={{ minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <h2 style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>Asteroid Catalog</h2>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={hazardousOnly} 
              onChange={(e) => setHazardousOnly(e.target.checked)} 
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Hazardous Only</span>
          </label>
          
          <input 
            type="text" 
            placeholder="Search by name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-dark)',
              color: 'var(--text-main)'
            }}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} style={thStyle}>
                Name {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('size_class')} style={thStyle}>
                Size Class {sortConfig.key === 'size_class' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('custom_risk_score')} style={thStyle}>
                Risk Score {sortConfig.key === 'custom_risk_score' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('is_hazardous')} style={thStyle}>
                Hazardous {sortConfig.key === 'is_hazardous' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('approach_date')} style={thStyle}>
                Approach Date {sortConfig.key === 'approach_date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('miss_distance_km')} style={thStyle}>
                Miss Distance (km) {sortConfig.key === 'miss_distance_km' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('velocity_kmh')} style={thStyle}>
                Velocity (km/h) {sortConfig.key === 'velocity_kmh' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredAsteroids.map(ast => (
              <tr 
                key={ast.id} 
                className="catalog-row" 
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedAsteroidId(ast.id)}
              >
                <td style={tdStyle} className="item-name">{ast.name}</td>
                <td style={tdStyle}>{ast.size_class}</td>
                <td style={tdStyle}><RiskBadge score={ast.custom_risk_score} /></td>
                <td style={tdStyle}>
                  {ast.is_hazardous ? (
                    <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>Yes</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>No</span>
                  )}
                </td>
                <td style={tdStyle} className="item-date">{ast.approach_date}</td>
                <td style={tdStyle}>{parseFloat(ast.miss_distance_km).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td style={tdStyle} className="item-velocity">{parseFloat(ast.velocity_kmh).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {sortedAndFilteredAsteroids.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  No asteroids found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AsteroidDetailModal 
        asteroidId={selectedAsteroidId} 
        onClose={() => setSelectedAsteroidId(null)} 
      />
    </div>
  );
};

const thStyle = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--border-color)',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  userSelect: 'none',
  fontWeight: '500',
  backgroundColor: 'rgba(255, 255, 255, 0.02)'
};

const tdStyle = {
  padding: '12px 16px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
};

export default AsteroidCatalog;

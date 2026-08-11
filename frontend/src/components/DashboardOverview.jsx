import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import api from '../api/axios';
import AsteroidDetailModal from './AsteroidDetailModal';
import RiskBadge from './RiskBadge';
import CountUp from './CountUp';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

const DashboardOverview = () => {
  const [stats, setStats] = useState({ totalTracked: 0, totalHazardous: 0, highestRisk: null });
  const [asteroids, setAsteroids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal state
  const [selectedAsteroidId, setSelectedAsteroidId] = useState(null);

  // Filter states
  const [filterHazardousOnly, setFilterHazardousOnly] = useState(false);
  const [filterSizeClass, setFilterSizeClass] = useState('All');
  const [filterMinRisk, setFilterMinRisk] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, astRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/asteroids')
        ]);

        setStats({
          totalTracked: statsRes.data.total_asteroids,
          totalHazardous: statsRes.data.total_hazardous,
          highestRisk: statsRes.data.highest_risk
            ? {
                score: statsRes.data.highest_risk.custom_risk_score,
                name: statsRes.data.highest_risk.name,
                id: statsRes.data.highest_risk.id
              }
            : null
        });
        setAsteroids(astRes.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch dashboard data. Please verify the API is running.');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-grid">
        <div className="metrics-row">
          {[1, 2, 3].map(i => (
            <div key={i} className="metric-card skeleton" style={{ height: '100px' }}></div>
          ))}
        </div>
        <div className="chart-section skeleton" style={{ height: '400px' }}></div>
      </div>
    );
  }

  if (error) {
    return <div className="error-boundary"><h3>Connection Error</h3><p>{error}</p></div>;
  }

  // Pre-process and filter chart data
  const filteredAsteroids = asteroids.filter(a => {
    if (filterHazardousOnly && !a.is_hazardous) return false;
    if (filterSizeClass !== 'All' && a.size_class !== filterSizeClass) return false;
    if (parseFloat(a.custom_risk_score) < filterMinRisk) return false;
    return true;
  });

  const normalAsteroids = filteredAsteroids.filter(a => !a.is_hazardous);
  const hazardousAsteroids = filteredAsteroids.filter(a => a.is_hazardous);

  const chartData = {
    datasets: [
      {
        label: 'Normal Objects',
        data: normalAsteroids.map(a => ({ 
          x: a.miss_distance_km, 
          y: a.estimated_diameter_max, 
          asteroidData: a 
        })),
        backgroundColor: 'rgba(0, 255, 255, 0.7)',
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: 'Hazardous Objects',
        data: hazardousAsteroids.map(a => ({ 
          x: a.miss_distance_km, 
          y: a.estimated_diameter_max,
          asteroidData: a 
        })),
        backgroundColor: 'rgba(255, 51, 51, 0.8)',
        pointRadius: 8,
        pointHoverRadius: 10,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const element = elements[0];
        const datasetIndex = element.datasetIndex;
        const index = element.index;
        const clickedData = chartData.datasets[datasetIndex].data[index];
        setSelectedAsteroidId(clickedData.asteroidData.id);
      }
    },
    plugins: {
      legend: { labels: { color: '#ffffff' } },
      tooltip: {
        theme: 'dark',
        callbacks: {
          label: (context) => {
            const data = context.raw.asteroidData;
            return [
              `Name: ${data.name}`,
              `Risk Score: ${data.custom_risk_score}`,
              `Date: ${data.approach_date}`
            ];
          }
        }
      }
    },
    scales: {
      x: { 
        title: { display: true, text: 'Miss Distance (km)', color: '#8b949e' },
        grid: { color: '#30363d' }, 
        ticks: { color: '#8b949e' } 
      },
      y: { 
        title: { display: true, text: 'Estimated Max Diameter (m)', color: '#8b949e' },
        grid: { color: '#30363d' }, 
        ticks: { color: '#8b949e' } 
      }
    }
  };

  return (
    <div className="dashboard-grid">
      {/* Metric Cards Row */}
      <div className="metrics-row">
        <div className="metric-card normal">
          <h3>Total Tracked</h3>
          <p className="value"><CountUp end={stats.totalTracked} /></p>
        </div>
        <div className="metric-card danger">
          <h3>Hazardous Objects</h3>
          <p className="value"><CountUp end={stats.totalHazardous} /></p>
        </div>
        <div 
          className="metric-card warning" 
          style={{ cursor: stats.highestRisk ? 'pointer' : 'default' }}
          onClick={() => stats.highestRisk && setSelectedAsteroidId(stats.highestRisk.id)}
        >
          <h3>Highest Risk Score</h3>
          <p className="value" style={{ display: 'flex', alignItems: 'center' }}>
            {stats.highestRisk ? <RiskBadge score={stats.highestRisk.score} /> : 'N/A'}
          </p>
          <small style={{ color: 'var(--text-muted)' }}>Asteroid: {stats.highestRisk ? stats.highestRisk.name : 'N/A'}</small>
        </div>
      </div>

      {/* Filter Controls Row */}
      <div className="filter-controls" style={{ 
        display: 'flex', 
        gap: '20px', 
        alignItems: 'center', 
        padding: '15px 20px',
        backgroundColor: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        flexWrap: 'wrap'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={filterHazardousOnly} 
            onChange={(e) => setFilterHazardousOnly(e.target.checked)} 
          />
          <span style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>Hazardous Only</span>
        </label>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Size:</span>
          <select 
            value={filterSizeClass}
            onChange={(e) => setFilterSizeClass(e.target.value)}
            style={{ padding: '6px 10px', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
          >
            <option value="All">All Sizes</option>
            <option value="Small">Small</option>
            <option value="Medium">Medium</option>
            <option value="Massive">Massive</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Min Risk Score: {filterMinRisk}</span>
          <input 
            type="range" 
            min="0" max="10" step="0.1" 
            value={filterMinRisk} 
            onChange={(e) => setFilterMinRisk(parseFloat(e.target.value))}
            style={{ width: '120px' }}
          />
        </div>
      </div>

      {/* Chart Row */}
      <div className="chart-section">
        <h2>Threat Radar</h2>
        <Scatter data={chartData} options={chartOptions} />
      </div>

      {/* Upcoming Approaches */}
      <div className="list-section">
        <h2>Upcoming Approaches (Next 5)</h2>
        <ul className="approach-list">
          {filteredAsteroids.slice(0, 5).map(obj => (
            <li 
              key={obj.id} 
              className="approach-item" 
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedAsteroidId(obj.id)}
            >
              <span className="item-name">{obj.name}</span>
              <span className="item-date">{obj.approach_date}</span>
              <span className="item-velocity">{parseFloat(obj.velocity_kmh).toLocaleString(undefined, { maximumFractionDigits: 2 })} km/h</span>
            </li>
          ))}
          {filteredAsteroids.length === 0 && (
            <li className="approach-item" style={{ justifyContent: 'center', color: 'var(--text-muted)' }}>
              No asteroids match your filters.
            </li>
          )}
        </ul>
      </div>

      <AsteroidDetailModal 
        asteroidId={selectedAsteroidId} 
        onClose={() => setSelectedAsteroidId(null)} 
      />
    </div>
  );
};

export default DashboardOverview;

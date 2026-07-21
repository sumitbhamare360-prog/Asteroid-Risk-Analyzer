import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import api from '../api/axios';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

const DashboardOverview = () => {
  const [stats, setStats] = useState({ totalTracked: 0, totalHazardous: 0, highestRisk: null });
  const [asteroids, setAsteroids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Normally we would use Promise.all to fetch both:
        // const [statsRes, astRes] = await Promise.all([
        //   api.get('/dashboard/stats'),
        //   api.get('/asteroids')
        // ]);
        // Mock data since backend isn't running
        setTimeout(() => {
          setStats({
            totalTracked: 12450,
            totalHazardous: 342,
            highestRisk: { score: 9.8, name: '2024 BX1' }
          });
          setAsteroids([
            { id: 1, name: '2024 BX1', miss_distance_km: 1500000, diameter_max_m: 50, is_hazardous: true, date: '2024-05-12', velocity: '15.2 km/s' },
            { id: 2, name: '2019 OK', miss_distance_km: 7000000, diameter_max_m: 130, is_hazardous: true, date: '2024-05-15', velocity: '24.5 km/s' },
            { id: 3, name: 'Bennu', miss_distance_km: 25000000, diameter_max_m: 490, is_hazardous: false, date: '2024-05-20', velocity: '27.7 km/s' },
            { id: 4, name: 'Apophis', miss_distance_km: 31000000, diameter_max_m: 370, is_hazardous: false, date: '2024-06-01', velocity: '30.2 km/s' },
            { id: 5, name: '2022 EB5', miss_distance_km: 4500000, diameter_max_m: 2, is_hazardous: false, date: '2024-06-10', velocity: '18.1 km/s' },
          ]);
          setLoading(false);
        }, 800);
      } catch (err) {
        setError('Failed to fetch dashboard data. Please verify the API is running.');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center' }}><div className="loading-spinner"></div></div>;
  }

  if (error) {
    return <div className="error-boundary"><h3>Connection Error</h3><p>{error}</p></div>;
  }

  const chartData = {
    datasets: [
      {
        label: 'Normal Objects',
        data: asteroids.filter(a => !a.is_hazardous).map(a => ({ x: a.miss_distance_km, y: a.diameter_max_m })),
        backgroundColor: '#00ffff',
        pointRadius: 6,
      },
      {
        label: 'Hazardous Objects',
        data: asteroids.filter(a => a.is_hazardous).map(a => ({ x: a.miss_distance_km, y: a.diameter_max_m })),
        backgroundColor: '#ff3333',
        pointRadius: 8,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#ffffff' } },
      tooltip: { theme: 'dark' }
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
          <p className="value">{stats.totalTracked.toLocaleString()}</p>
        </div>
        <div className="metric-card danger">
          <h3>Hazardous Objects</h3>
          <p className="value">{stats.totalHazardous.toLocaleString()}</p>
        </div>
        <div className="metric-card warning">
          <h3>Highest Risk Score</h3>
          <p className="value">{stats.highestRisk ? stats.highestRisk.score : 'N/A'}</p>
          <small style={{ color: 'var(--text-muted)' }}>Asteroid: {stats.highestRisk ? stats.highestRisk.name : 'N/A'}</small>
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
          {asteroids.slice(0, 5).map(obj => (
            <li key={obj.id} className="approach-item">
              <span className="item-name">{obj.name}</span>
              <span className="item-date">{obj.date}</span>
              <span className="item-velocity">{obj.velocity}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DashboardOverview;

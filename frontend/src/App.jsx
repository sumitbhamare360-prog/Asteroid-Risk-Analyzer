import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardOverview from './components/DashboardOverview';
import AsteroidCatalog from './components/AsteroidCatalog';
import './index.css';

function App() {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardOverview />} />
            <Route path="/catalog" element={<AsteroidCatalog />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;

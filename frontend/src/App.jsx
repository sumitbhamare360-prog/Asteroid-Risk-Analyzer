import React from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardOverview from './components/DashboardOverview';
import './index.css';

function App() {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <Header />
        <main className="main-content">
          <DashboardOverview />
        </main>
      </div>
    </div>
  );
}

export default App;

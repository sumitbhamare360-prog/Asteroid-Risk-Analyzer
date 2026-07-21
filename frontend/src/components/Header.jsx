import React from 'react';

const Header = ({ apiStatus = 'connected' }) => {
  const isError = apiStatus === 'error';
  return (
    <header className="header">
      <h1>☄️ AstraGuard: Asteroid Risk Analyzer</h1>
      <div className={`status-badge ${isError ? 'error' : ''}`}>
        <span className={`status-dot ${isError ? 'error' : ''}`}></span>
        {isError ? 'API Disconnected' : 'API Connected: Port 5000'}
      </div>
    </header>
  );
};

export default Header;

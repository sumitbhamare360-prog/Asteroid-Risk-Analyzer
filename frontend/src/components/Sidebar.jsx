import React from 'react';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div style={{ marginBottom: '30px', color: 'var(--text-muted)' }}>
        <small>NAVIGATION</small>
      </div>
      <a className="sidebar-link active" href="#dashboard">Dashboard Overview</a>
      <a className="sidebar-link" href="#catalog">Asteroid Catalog</a>
    </aside>
  );
};

export default Sidebar;

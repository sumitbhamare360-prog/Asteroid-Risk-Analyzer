import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div style={{ marginBottom: '30px', color: 'var(--text-muted)' }}>
        <small>NAVIGATION</small>
      </div>
      <NavLink className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'} to="/" end>Dashboard Overview</NavLink>
      <NavLink className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'} to="/catalog">Asteroid Catalog</NavLink>
      <NavLink className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'} to="/simulation">Simulation</NavLink>
    </aside>
  );
};

export default Sidebar;

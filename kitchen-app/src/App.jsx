import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import MasterList from './pages/MasterList';
import Recipes from './pages/Recipes';
import MonthlyMenu from './pages/MonthlyMenu';
import Departments from './pages/Departments';
import DailyKitchen from './pages/DailyKitchen';
import AmountClaim from './pages/AmountClaim';

const NAV_ITEMS = [
  { path: '/daily-kitchen', label: 'Daily Kitchen', icon: '🔥', section: 'Operations' },
  { path: '/master-list', label: 'Master List', icon: '📦', section: 'Data' },
  { path: '/recipes', label: 'Recipes', icon: '🍳', section: 'Data' },
  { path: '/monthly-menu', label: 'Monthly Menu', icon: '📅', section: 'Planning' },
  { path: '/departments', label: 'Departments', icon: '🏢', section: 'Planning' },
  { path: '/amount-claim', label: 'Amount Claim', icon: '💰', section: 'Finance' },
];

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('kd_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kd_theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }

  // Group nav items by section
  const sections = {};
  NAV_ITEMS.forEach(item => {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  });

  return (
    <HashRouter>
      <div className="app-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo">K</div>
            <div>
              <div className="sidebar-title">Kitchen</div>
              <div className="sidebar-subtitle">Dashboard</div>
            </div>
          </div>
          <nav className="sidebar-nav">
            {Object.entries(sections).map(([section, items]) => (
              <div key={section}>
                <div className="nav-section-label">{section}</div>
                {items.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="flex items-center justify-between mb-sm">
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Theme
              </span>
              <button
                type="button"
                onClick={toggleTheme}
                className="theme-toggle-btn"
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Day'} Mode`}
              >
                <span>{theme === 'light' ? '☀️ Day' : '🌙 Dark'}</span>
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Kitchen Dashboard v1.0
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/daily-kitchen" replace />} />
            <Route path="/daily-kitchen" element={<DailyKitchen />} />
            <Route path="/master-list" element={<MasterList />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/monthly-menu" element={<MonthlyMenu />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/amount-claim" element={<AmountClaim />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

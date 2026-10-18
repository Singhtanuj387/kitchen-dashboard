import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import MasterList from './pages/MasterList';
import Recipes from './pages/Recipes';
import MonthlyMenu from './pages/MonthlyMenu';
import Departments from './pages/Departments';
import DailyKitchen from './pages/DailyKitchen';
import AmountClaim from './pages/AmountClaim';
import History from './pages/History';
import CostSettings from './pages/CostSettings';
import MonthlyReport from './pages/MonthlyReport';
import { Purchasing, Expenses } from './pages/Purchasing';
import { isFirebaseConfigured } from './firebase';
import { store } from './store';

const NAV_ITEMS = [
  { path: '/daily-kitchen', label: 'Daily Kitchen', icon: '🔥', section: 'Operations' },
  { path: '/history', label: 'History', icon: '📜', section: 'Operations' },
  { path: '/master-list', label: 'Master List', icon: '📦', section: 'Data' },
  { path: '/recipes', label: 'Recipes', icon: '🍳', section: 'Data' },
  { path: '/monthly-menu', label: 'Monthly Menu', icon: '📅', section: 'Planning' },
  { path: '/departments', label: 'Departments', icon: '🏢', section: 'Planning' },
  { path: '/amount-claim', label: 'Amount Claim', icon: '💰', section: 'Finance' },
  { path: '/monthly-report', label: 'Monthly Report', icon: '📈', section: 'Finance' },
  { path: '/purchasing', label: 'Purchasing', icon: '🛒', section: 'Finance' },
  { path: '/expenses', label: 'Expenses', icon: '🧾', section: 'Finance' },
  { path: '/cost-settings', label: 'Cost Settings', icon: '⚙️', section: 'Finance' },
];

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('kd_theme') || 'light');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem('kd_sidebar_collapsed') === 'true'
  );
  const isCloudActive = isFirebaseConfigured();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kd_theme', theme);
  }, [theme]);

  useEffect(() => {
    // If Firebase environment variables are configured, enable live background sync
    if (isCloudActive) {
      const unsub = store.initLiveFirestoreSync();
      return () => unsub();
    }
  }, [isCloudActive]);

  function toggleTheme() {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }

  function toggleSidebar() {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('kd_sidebar_collapsed', String(next));
      return next;
    });
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
        <aside className={`sidebar ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-logo">K</div>
            <div>
              <div className="sidebar-title">Kitchen</div>
              <div className="sidebar-subtitle">Dashboard</div>
            </div>
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={toggleSidebar}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            >
              {isSidebarCollapsed ? '›' : '‹'}
            </button>
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
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
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

            {isCloudActive && (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--success)',
                  fontWeight: 600,
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'var(--success-subtle)',
                  border: '1px solid var(--success-border)',
                }}
              >
                <span>🟢</span> Firestore Sync Active
              </div>
            )}

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
            <Route path="/history" element={<History />} />
            <Route path="/master-list" element={<MasterList />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/monthly-menu" element={<MonthlyMenu />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/amount-claim" element={<AmountClaim />} />
            <Route path="/monthly-report" element={<MonthlyReport />} />
            <Route path="/purchasing" element={<Purchasing />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/cost-settings" element={<CostSettings />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

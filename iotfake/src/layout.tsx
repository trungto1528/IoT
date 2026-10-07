import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [SHOW_ADD_DEVICE] = useState<boolean>(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isLoggedIn');
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div style={styles.root}>
      <div style={styles.bgOverlay} />

      <div style={styles.layout}>
        <aside style={styles.sidebar}>
          <div style={styles.sidebarTop}>
            <h1 style={styles.brandTitle}>
              IoT và ứng dụng
            </h1>

            <nav style={styles.navGroup}>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  ...styles.navBtn,
                  ...(isActive('/dashboard')
                    ? styles.navBtnActive
                    : {}),
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>

                <span>Dashboard</span>
              </button>

              <button
                onClick={() => navigate('/data')}
                style={{
                  ...styles.navBtn,
                  ...(isActive('/data')
                    ? styles.navBtnActive
                    : {}),
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M2 12h3l3-9 6 18 3-9h5" />
                </svg>

                <span>Sensor Data</span>
              </button>

              <button
                onClick={() => navigate('/activity')}
                style={{
                  ...styles.navBtn,
                  ...(isActive('/activity')
                    ? styles.navBtnActive
                    : {}),
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>

                <span>Activity History</span>
              </button>
            </nav>
          </div>

          <div style={styles.sidebarBottom}>
            {SHOW_ADD_DEVICE && (
              <button
                onClick={() => navigate('/add-device')}
                style={{
                  ...styles.addDeviceBtn,
                  ...(isActive('/add-device')
                    ? styles.addDeviceBtnActive
                    : {}),
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line
                    x1="12"
                    y1="5"
                    x2="12"
                    y2="19"
                  />
                  <line
                    x1="5"
                    y1="12"
                    x2="19"
                    y2="12"
                  />
                </svg>

                <span>Add Device</span>
              </button>
            )}

            <button
              onClick={() => navigate('/profile')}
              style={{
                ...styles.navBtn,
                ...(isActive('/profile')
                  ? styles.navBtnActive
                  : {}),
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>

              <span>Profile</span>
            </button>

            <button
              onClick={handleLogout}
              style={styles.logoutBtn}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>

              <span>Logout</span>
            </button>
          </div>
        </aside>

        <main style={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  root: {
    width: '100%',
    height: '100vh',
    minWidth: 0,
    minHeight: 0,

    backgroundColor: '#f5f7fb',

    fontFamily: "'Inter', system-ui, sans-serif",

    position: 'relative',

    color: '#111827',

    overflow: 'hidden',
    boxSizing: 'border-box',
  },

  /*
   * Nền sáng cố định.
   * Không còn gradient tối / overlay tối.
   */
  bgOverlay: {
    position: 'absolute',
    inset: 0,

    background:
      'linear-gradient(168deg, #ffffff 0%, #f8fafc 50%, #f5f7fb 100%)',

    zIndex: 1,
    pointerEvents: 'none',
  },

  layout: {
    position: 'relative',
    zIndex: 2,

    display: 'flex',

    width: '100%',
    height: '100%',

    minWidth: 0,
    minHeight: 0,

    overflow: 'hidden',
  },

  sidebar: {
    width: 'clamp(180px, 18vw, 240px)',
    flex: '0 0 clamp(180px, 18vw, 240px)',

    minWidth: 0,
    minHeight: 0,

    background: '#ffffff',

    borderRight: '1px solid #e5e7eb',

    boxShadow:
      '2px 0 8px rgba(15, 23, 42, 0.04)',

    backdropFilter: 'none',

    padding:
      'clamp(16px, 2.5vw, 32px) clamp(10px, 1.5vw, 20px)',

    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',

    overflow: 'hidden',
    boxSizing: 'border-box',
  },

  sidebarTop: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(18px, 3vw, 36px)',
    minWidth: 0,
  },

  brandTitle: {
    margin: 0,

    fontSize: 'clamp(14px, 1.5vw, 20px)',
    lineHeight: 1.2,

    fontWeight: 700,

    color: '#16a34a',

    letterSpacing: '-0.3px',

    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  navGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(4px, 0.6vw, 8px)',
    minWidth: 0,
  },

  navBtn: {
    width: '100%',
    minWidth: 0,

    display: 'flex',
    alignItems: 'center',

    gap: 'clamp(6px, 0.8vw, 12px)',

    padding:
      'clamp(8px, 1vw, 12px) clamp(8px, 1.2vw, 16px)',

    borderRadius: '8px',
    border: 'none',

    background: 'transparent',

    color: '#6b7280',

    fontSize: 'clamp(11px, 0.9vw, 14px)',
    fontWeight: 500,

    cursor: 'pointer',
    textAlign: 'left',

    transition: 'all 0.2s ease',

    boxSizing: 'border-box',
  },

  navBtnActive: {
    background: '#ecfdf5',

    color: '#16a34a',

    boxShadow:
      'inset 0 0 0 1px #bbf7d0',
  },

  sidebarBottom: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(4px, 0.6vw, 8px)',
    minWidth: 0,
  },

  addDeviceBtn: {
    width: '100%',
    minWidth: 0,

    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',

    gap: '8px',

    padding:
      'clamp(7px, 0.9vw, 10px) clamp(8px, 1.2vw, 16px)',

    borderRadius: '8px',

    border: '1px solid #bbf7d0',

    background: '#f0fdf4',

    boxShadow:
      '0 2px 6px rgba(22, 163, 74, 0.08)',

    color: '#16a34a',

    fontSize: 'clamp(11px, 0.9vw, 14px)',
    fontWeight: 600,

    cursor: 'pointer',
    marginBottom: '8px',

    transition: 'all 0.2s ease',

    boxSizing: 'border-box',
  },

  addDeviceBtnActive: {
    background: '#dcfce7',

    borderColor: '#86efac',

    boxShadow:
      '0 2px 8px rgba(22, 163, 74, 0.12)',
  },

  logoutBtn: {
    width: '100%',
    minWidth: 0,

    display: 'flex',
    alignItems: 'center',

    gap: 'clamp(6px, 0.8vw, 12px)',

    background: 'transparent',
    border: 'none',

    color: '#6b7280',

    fontSize: 'clamp(11px, 0.9vw, 14px)',
    fontWeight: 500,

    cursor: 'pointer',

    padding:
      'clamp(8px, 1vw, 12px) clamp(8px, 1.2vw, 16px)',

    borderRadius: '8px',

    textAlign: 'left',
    boxSizing: 'border-box',

    transition: 'all 0.2s ease',
  },

  mainContent: {
    flex: '1 1 auto',

    width: 0,

    minWidth: 0,
    minHeight: 0,

    height: '100%',

    padding:
      'clamp(14px, 3vw, 40px) clamp(14px, 3.5vw, 48px)',

    display: 'flex',
    flexDirection: 'column',

    gap: 'clamp(10px, 1.8vw, 24px)',

    overflow: 'hidden',

    boxSizing: 'border-box',
  },
};

export default MainLayout;
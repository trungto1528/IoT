import React from 'react';

const COLORS = {
  cardBg: 'rgba(255, 255, 255, 0.03)',
  cardBorder: 'rgba(255, 255, 255, 0.1)',
  textSubtle: '#c2c6d6',
  textPrimary: '#dae2fd',
};

const RESOURCE_LINKS = [
  { label: 'GitHub', url: 'https://github.com/trungto1528/IoT' },
  {
    label: 'Postman',
    url: 'https://toquangtrung2510-2949482.postman.co/workspace/Default-workspace~dc498567-9ee6-4a77-9253-63fe99636a35/collection/49928453-50eea0a6-27f0-4f92-984a-b8eef075c8e7?action=share&creator=49928453',
  },
  { label: 'Figma', url: 'https://www.figma.com/site/N2Sg8smyFsJmTT43LPS0uR/Untitled?node-id=2-588&t=CBHmJ8Ut7V4J7yHb-1' },
  {label: 'Tài liệu', url: "Tai_lieu_IoT.pdf"}
];

import avatarImage from './assets/AT.jpg';

export function Profile() {
  return (
    <div style={styles.container}>
      <h2 style={styles.pageTitle}>Profile</h2>

      <div style={styles.card}>
        <div style={styles.decorativeGlow} />

        <div style={styles.contentGrid}>
          <div style={styles.userSection}>
            <div style={styles.avatar}>
              {avatarImage ? (
                <img src={avatarImage} alt="Tô Quang Trung" style={styles.avatarImage} />
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true" style={styles.avatarFallback}>
                  <path
                    fill="currentColor"
                    d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v3h16v-3c0-2.76-3.58-5-8-5Z"
                  />
                </svg>
              )}
            </div>
            <div style={styles.identity}>
              <span style={styles.name}>Tô Quang Trung</span>
              <span style={styles.identityMeta}>MSV: B23DCCN863</span>
              <span style={styles.identityMeta}>Lớp: D23CNPM04</span>
            </div>
          </div>

          <div style={styles.details}>
            {RESOURCE_LINKS.map((link, index) => (
              <React.Fragment key={link.label}>
                <div style={styles.detailItem}>
                  <span style={styles.label}>{link.label}</span>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.value}
                  >
                    {link.url}
                  </a>
                </div>
                {index < RESOURCE_LINKS.length - 1 && <hr style={styles.divider} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(12px, 2vw, 24px)',
    width: '100%',
    height: '100%',
    minWidth: 0,
    minHeight: 0,
    alignItems: 'center',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  pageTitle: {
    color: COLORS.textPrimary,
    fontSize: 'clamp(22px, 2.5vw, 32px)',
    fontWeight: 600,
    margin: 0,
    textAlign: 'center',
    flexShrink: 0,
  },
  card: {
    width: 'min(100%, 820px)',
    minWidth: 0,
    background: COLORS.cardBg,
    boxShadow: `inset 0 0 0 1px ${COLORS.cardBorder}, 0 25px 50px -12px rgba(0, 0, 0, 0.25)`,
    borderRadius: 'clamp(8px, 1vw, 12px)',
    backdropFilter: 'blur(24px)',
    padding: 'clamp(16px, 3vw, 32px)',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  decorativeGlow: {
    background: 'rgba(173, 198, 255, 0.1)',
    borderRadius: '50%',
    filter: 'blur(64px)',
    position: 'absolute',
    top: 'clamp(-127px, -10vw, -60px)',
    right: 'clamp(-84px, -8vw, -40px)',
    width: 'clamp(160px, 20vw, 256px)',
    height: 'clamp(160px, 20vw, 256px)',
    pointerEvents: 'none',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'clamp(90px, 18vw, 160px) minmax(0, 1fr)',
    gap: 'clamp(14px, 3vw, 32px)',
    alignItems: 'center',
    minWidth: 0,
    position: 'relative',
  },
  userSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'clamp(8px, 1.5vw, 16px)',
    minWidth: 0,
  },
  avatar: {
    width: 'clamp(72px, 12vw, 128px)',
    height: 'clamp(72px, 12vw, 128px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRadius: '50%',
    overflow: 'hidden',
    background: 'rgba(148, 163, 184, 0.12)',
    color: '#94a3b8',
  },
  avatarFallback: { width: '70%', height: '70%' },
  avatarImage: { width: '100%', height: '100%', objectFit: 'cover' },
  identity: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    minWidth: 0,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: 'clamp(13px, 1.5vw, 20px)',
    fontWeight: 600,
    lineHeight: 1.4,
    textAlign: 'center',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  identityMeta: {
    color: COLORS.textSubtle,
    fontSize: 'clamp(10px, 1vw, 13px)',
    fontFamily: "'JetBrains Mono', monospace",
    lineHeight: 1.35,
    whiteSpace: 'nowrap',
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(12px, 1.5vw, 18px)',
    minWidth: 0,
  },
  detailItem: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 'clamp(12px, 2vw, 24px)',
    minWidth: 0,
  },
  label: {
    color: COLORS.textSubtle,
    fontSize: 'clamp(10px, 0.8vw, 12px)',
    flexShrink: 0,
  },
  value: {
    color: COLORS.textPrimary,
    fontSize: 'clamp(11px, 1vw, 16px)',
    fontFamily: "'JetBrains Mono', monospace",
    minWidth: 0,
    marginLeft: 'auto',
    textAlign: 'right',
    overflowWrap: 'anywhere',
    textDecoration: 'none',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    margin: 0,
    width: '100%',
  },
};

export default Profile;

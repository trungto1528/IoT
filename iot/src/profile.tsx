import React from 'react';

const COLORS = {
  cardBg: 'rgba(255, 255, 255, 0.03)',
  cardBorder: 'rgba(255, 255, 255, 0.1)',
  textSubtle: '#c2c6d6',
  textPrimary: '#dae2fd',
};

export function Profile() {
  return (
    <>
      <svg
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 0,
          height: 0,
          overflow: 'hidden',
        }}
      >
        <defs>
          <path
            id="figma-vector-95"
            d="M65.306 65.306C56.327 65.306 48.639 62.109 42.245 55.714C35.85 49.32 32.653 41.633 32.653 32.653C32.653 23.673 35.85 15.986 42.245 9.592C48.639 3.197 56.327 0 65.306 0C74.286 0 81.973 3.197 88.367 9.592C94.762 15.986 97.959 23.673 97.959 32.653C97.959 41.633 94.762 49.32 88.367 55.714C81.973 62.109 74.286 65.306 65.306 65.306ZM0 130.612L0 107.755C0 103.129 1.19 98.878 3.571 95C5.952 91.122 9.116 88.163 13.061 86.122C21.497 81.905 30.068 78.741 38.776 76.633C47.483 74.524 56.327 73.469 65.306 73.469C74.286 73.469 83.129 74.524 91.837 76.633C100.544 78.741 109.116 81.905 117.551 86.122C121.497 88.163 124.66 91.122 127.041 95C129.422 98.878 130.612 103.129 130.612 107.755L130.612 130.612L0 130.612Z"
            fillRule="nonzero"
          />
        </defs>
      </svg>

      <div style={styles.container}>
        <h2 style={styles.pageTitle}>
        Profile
        </h2>

        <div style={styles.card}>
          <div style={styles.decorativeGlow} />

          <div style={styles.contentGrid}>
            <div style={styles.userSection}>
              <div style={styles.avatar}>
                <svg
                  viewBox="0 0 130.612 130.612"
                  style={styles.avatarSvg}
                >
                  <use
                    href="#figma-vector-95"
                    fill="#94a3b8"
                  />
                </svg>
              </div>

              <span style={styles.name}>
                Tô Quang Trung
              </span>
            </div>

            <div style={styles.details}>
              <div style={styles.detailItem}>
                <span style={styles.label}>
                  Username
                </span>

                <span style={styles.value}>
                  admin@iot-nexus.vn
                </span>
              </div>

              <hr style={styles.divider} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
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

    fontSize:
      'clamp(22px, 2.5vw, 32px)',

    fontWeight: 600,

    margin: 0,

    textAlign: 'center',

    flexShrink: 0,
  },

  card: {
    width: 'min(100%, 720px)',

    maxHeight:
      'calc(100% - clamp(40px, 5vw, 56px))',

    minWidth: 0,

    background: COLORS.cardBg,

    boxShadow:
      `inset 0 0 0 1px ${COLORS.cardBorder}, 0px 25px 50px -12px rgba(0, 0, 0, 0.25)`,

    borderRadius:
      'clamp(8px, 1vw, 12px)',

    backdropFilter: 'blur(24px)',

    padding:
      'clamp(16px, 3vw, 32px)',

    position: 'relative',

    overflow: 'hidden',

    boxSizing: 'border-box',
  },

  decorativeGlow: {
    background:
      'rgba(173, 198, 255, 0.1)',

    borderRadius: '50%',

    filter: 'blur(64px)',

    position: 'absolute',

    top: 'clamp(-127px, -10vw, -60px)',
    right: 'clamp(-84px, -8vw, -40px)',

    width:
      'clamp(160px, 20vw, 256px)',

    height:
      'clamp(160px, 20vw, 256px)',

    pointerEvents: 'none',
  },

  contentGrid: {
    display: 'grid',

    gridTemplateColumns:
      'clamp(90px, 18vw, 160px) minmax(0, 1fr)',

    gap:
      'clamp(14px, 3vw, 32px)',

    alignItems: 'center',

    minWidth: 0,
  },

  userSection: {
    display: 'flex',
    flexDirection: 'column',

    alignItems: 'center',

    gap:
      'clamp(8px, 1.5vw, 16px)',

    minWidth: 0,
  },

  avatar: {
    width:
      'clamp(72px, 12vw, 128px)',

    height:
      'clamp(72px, 12vw, 128px)',

    display: 'flex',

    alignItems: 'center',
    justifyContent: 'center',

    flexShrink: 0,
  },

  avatarSvg: {
    width: '100%',
    height: '100%',
  },

  name: {
    color: COLORS.textPrimary,

    fontSize:
      'clamp(13px, 1.5vw, 20px)',

    fontWeight: 600,

    lineHeight: 1.4,

    textAlign: 'center',

    maxWidth: '100%',

    overflow: 'hidden',

    textOverflow: 'ellipsis',

    whiteSpace: 'nowrap',
  },

  details: {
    display: 'flex',
    flexDirection: 'column',

    gap:
      'clamp(14px, 2vw, 24px)',

    minWidth: 0,
  },

  detailItem: {
    display: 'flex',
    flexDirection: 'column',

    gap: '4px',

    minWidth: 0,
  },

  label: {
    color: COLORS.textSubtle,

    fontSize:
      'clamp(10px, 0.8vw, 12px)',
  },

  value: {
    color: COLORS.textPrimary,

    fontSize:
      'clamp(11px, 1vw, 16px)',

    fontFamily:
      "'JetBrains Mono', monospace",

    overflow: 'hidden',

    textOverflow: 'ellipsis',

    whiteSpace: 'nowrap',

    minWidth: 0,
  },

  divider: {
    border: 'none',

    borderTop:
      '1px solid rgba(255, 255, 255, 0.05)',

    margin: 0,

    width: '100%',
  },
};

export default Profile;
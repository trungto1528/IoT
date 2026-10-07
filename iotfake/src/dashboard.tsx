import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SensorData {
  temperature: number;
  humidity: number;
  light: number;
}

interface HistoryPoint extends SensorData {
  timestamp: string;
}

type LEDId = 'led1' | 'led2' | 'led3' | 'led4';

interface ToastNotification {
  id: number;
  message: string;
  type: 'success' | 'error';
}

const LED_INDEX_MAP: Record<LEDId, number> = {
  led1: 1,
  led2: 2,
  led3: 3,
  led4: 4,
};

const SENSOR_CONFIG = {
  temperature: {
    min: 0,
    max: 50,
    color: '#f97316',
  },
  humidity: {
    min: 0,
    max: 100,
    color: '#2563eb',
  },
  light: {
    min: 0,
    max: 10000,
    color: '#16a34a',
  },
};

/* Mock cố định: không API, không MQTT, không tạo điểm mới. */
const MOCK_HISTORY: HistoryPoint[] = [
  { temperature: 24.5, humidity: 58.2, light: 4200, timestamp: '2026-10-07T08:00:00' },
  { temperature: 24.8, humidity: 59.1, light: 4500, timestamp: '2026-10-07T08:02:00' },
  { temperature: 25.1, humidity: 60.0, light: 4800, timestamp: '2026-10-07T08:04:00' },
  { temperature: 25.3, humidity: 61.2, light: 5100, timestamp: '2026-10-07T08:06:00' },
  { temperature: 25.0, humidity: 60.8, light: 5300, timestamp: '2026-10-07T08:08:00' },
  { temperature: 25.4, humidity: 62.0, light: 5600, timestamp: '2026-10-07T08:10:00' },
  { temperature: 25.7, humidity: 61.5, light: 5900, timestamp: '2026-10-07T08:12:00' },
  { temperature: 26.0, humidity: 60.7, light: 6100, timestamp: '2026-10-07T08:14:00' },
  { temperature: 26.2, humidity: 59.9, light: 6400, timestamp: '2026-10-07T08:16:00' },
  { temperature: 26.4, humidity: 59.2, light: 6700, timestamp: '2026-10-07T08:18:00' },
  { temperature: 26.1, humidity: 58.8, light: 6900, timestamp: '2026-10-07T08:20:00' },
  { temperature: 25.9, humidity: 59.5, light: 7100, timestamp: '2026-10-07T08:22:00' },
  { temperature: 25.6, humidity: 60.1, light: 7300, timestamp: '2026-10-07T08:24:00' },
  { temperature: 25.8, humidity: 60.6, light: 7500, timestamp: '2026-10-07T08:26:00' },
  { temperature: 26.0, humidity: 61.0, light: 7700, timestamp: '2026-10-07T08:28:00' },
  { temperature: 26.3, humidity: 60.4, light: 7900, timestamp: '2026-10-07T08:30:00' },
  { temperature: 26.5, humidity: 59.8, light: 8100, timestamp: '2026-10-07T08:32:00' },
  { temperature: 26.7, humidity: 59.1, light: 8300, timestamp: '2026-10-07T08:34:00' },
  { temperature: 26.4, humidity: 58.7, light: 8500, timestamp: '2026-10-07T08:36:00' },
  { temperature: 26.2, humidity: 59.3, light: 8200, timestamp: '2026-10-07T08:38:00' },
  { temperature: 26.0, humidity: 60.0, light: 7900, timestamp: '2026-10-07T08:40:00' },
  { temperature: 25.8, humidity: 60.8, light: 7600, timestamp: '2026-10-07T08:42:00' },
  { temperature: 25.5, humidity: 61.4, light: 7300, timestamp: '2026-10-07T08:44:00' },
  { temperature: 25.3, humidity: 62.0, light: 7000, timestamp: '2026-10-07T08:46:00' },
  { temperature: 25.1, humidity: 62.5, light: 6700, timestamp: '2026-10-07T08:48:00' },
  { temperature: 24.9, humidity: 62.1, light: 6400, timestamp: '2026-10-07T08:50:00' },
  { temperature: 24.7, humidity: 61.6, light: 6100, timestamp: '2026-10-07T08:52:00' },
  { temperature: 24.6, humidity: 60.9, light: 5800, timestamp: '2026-10-07T08:54:00' },
  { temperature: 24.8, humidity: 60.2, light: 5500, timestamp: '2026-10-07T08:56:00' },
  { temperature: 25.0, humidity: 59.7, light: 5200, timestamp: '2026-10-07T08:58:00' },
];

export function Dashboard() {
  const navigate = useNavigate();

  const [sensorData] = useState<SensorData>(() => ({
    temperature: MOCK_HISTORY[MOCK_HISTORY.length - 1].temperature,
    humidity: MOCK_HISTORY[MOCK_HISTORY.length - 1].humidity,
    light: MOCK_HISTORY[MOCK_HISTORY.length - 1].light,
  }));

  const [history] = useState<HistoryPoint[]>(MOCK_HISTORY);

  const [ledStates, setLedStates] = useState<Record<LEDId, boolean>>({
    led1: false,
    led2: false,
    led3: false,
    led4: false,
  });

  const [loadingLed, setLoadingLed] = useState<Record<LEDId, boolean>>({
    led1: false,
    led2: false,
    led3: false,
    led4: false,
  });

  const [toast, setToast] = useState<ToastNotification | null>(null);

  // Mock dashboard luôn hiển thị trạng thái kết nối.
  const isConnected = true;

  const showToast = (message: string, type: 'success' | 'error') => {
    const toastId = Date.now();

    setToast({
      id: toastId,
      message,
      type,
    });

    setTimeout(() => {
      setToast((current) =>
        current?.id === toastId ? null : current
      );
    }, 3000);
  };

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');

    if (isLoggedIn !== 'true') {
      navigate('/');
    }
  }, [navigate]);

  const formatChartTime = (timestamp: string): string => {
    if (!timestamp) return '';

    const value = timestamp.replace('T', ' ');

    if (value.includes(' ')) {
      return value.split(' ')[1]?.substring(0, 8) ?? value;
    }

    return value.substring(0, 8);
  };

  const toggleLED = async (ledId: LEDId) => {
    if (loadingLed[ledId]) return;

    const ledNumber = LED_INDEX_MAP[ledId];
    const targetStatus = !ledStates[ledId];

    setLoadingLed((prev) => ({
      ...prev,
      [ledId]: true,
    }));

    // Chỉ mô phỏng thao tác bật/tắt, không gọi API.
    await new Promise((resolve) => setTimeout(resolve, 200));

    setLedStates((prev) => ({
      ...prev,
      [ledId]: targetStatus,
    }));

    showToast(
      `Đã ${targetStatus ? 'bật' : 'tắt'} Đèn LED ${ledNumber} thành công!`,
      'success'
    );

    setLoadingLed((prev) => ({
      ...prev,
      [ledId]: false,
    }));
  };

  const generateSvgPath = (key: keyof SensorData): string => {
    if (history.length === 0) return '';

    const width = 500;
    const height = 200;
    const padding = 10;
    const usableHeight = height - padding * 2;

    const stepX =
      history.length > 1
        ? width / (history.length - 1)
        : width;

    const { min, max: defaultConfigMax } = SENSOR_CONFIG[key];

    const effectiveMax = defaultConfigMax;
    const range = effectiveMax - min || 1;

    return history
      .map((point, index) => {
        const x = index * stepX;

        const value = Math.max(
          min,
          Math.min(effectiveMax, point[key])
        );

        const normalized =
          (value - min) / range;

        const y =
          height -
          padding -
          normalized * usableHeight;

        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }

            100% {
              transform: rotate(360deg);
            }
          }

          @keyframes slideDown {
            from {
              transform: translate(-50%, -20px);
              opacity: 0;
            }

            to {
              transform: translate(-50%, 0);
              opacity: 1;
            }
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }

            50% {
              opacity: 0.5;
            }
          }
        `}
      </style>

      {!isConnected && (
        <div style={styles.disconnectBanner}>
          <span style={styles.disconnectDot} />

          <span>
            Mất kết nối với thiết bị cảm biến
          </span>
        </div>
      )}

      {toast && (
        <div
          style={{
            ...styles.toast,
            backgroundColor:
              toast.type === 'success'
                ? '#16a34a'
                : '#dc2626',
          }}
        >
          <span style={styles.toastIcon}>
            {toast.type === 'success'
              ? '✓'
              : '✕'}
          </span>

          <span>{toast.message}</span>
        </div>
      )}

      <div style={styles.cardsRow}>
        <div
          style={{
            ...styles.card,
            opacity: isConnected ? 1 : 0.6,
          }}
        >
          <div style={styles.cardLabel}>
            NHIỆT ĐỘ
          </div>

          <div style={styles.cardValGroup}>
            <span style={styles.cardVal}>
              {sensorData.temperature}
            </span>

            <span style={styles.cardUnit}>
              °C
            </span>
          </div>
        </div>

        <div
          style={{
            ...styles.card,
            opacity: isConnected ? 1 : 0.6,
          }}
        >
          <div style={styles.cardLabel}>
            ĐỘ ẨM
          </div>

          <div style={styles.cardValGroup}>
            <span style={styles.cardVal}>
              {sensorData.humidity}
            </span>

            <span style={styles.cardUnit}>
              %
            </span>
          </div>
        </div>

        <div
          style={{
            ...styles.card,
            opacity: isConnected ? 1 : 0.6,
          }}
        >
          <div style={styles.cardLabel}>
            ÁNH SÁNG
          </div>

          <div style={styles.cardValGroup}>
            <span style={styles.cardVal}>
              {sensorData.light}
            </span>

            <span style={styles.cardUnit}>
              Lux
            </span>
          </div>
        </div>
      </div>

      <div style={styles.gridContainer}>
        <div style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <h3 style={styles.cardTitle}>
              Giám sát thời gian thực
            </h3>

            <div style={styles.legendGroup}>
              <div style={styles.legendItem}>
                <span
                  style={{
                    ...styles.legendDot,
                    background:
                      SENSOR_CONFIG.temperature.color,
                  }}
                />

                <span style={styles.legendText}>
                  Nhiệt độ
                </span>
              </div>

              <div style={styles.legendItem}>
                <span
                  style={{
                    ...styles.legendDot,
                    background:
                      SENSOR_CONFIG.humidity.color,
                  }}
                />

                <span style={styles.legendText}>
                  Độ ẩm
                </span>
              </div>

              <div style={styles.legendItem}>
                <span
                  style={{
                    ...styles.legendDot,
                    background:
                      SENSOR_CONFIG.light.color,
                  }}
                />

                <span style={styles.legendText}>
                  Ánh sáng
                </span>
              </div>
            </div>
          </div>

          <div style={styles.chartBody}>
            <div style={styles.chartGridLines}>
              <div
                style={{
                  ...styles.gridLine,
                  top: '0%',
                }}
              />

              <div
                style={{
                  ...styles.gridLine,
                  top: '25%',
                }}
              />

              <div
                style={{
                  ...styles.gridLine,
                  top: '50%',
                }}
              />

              <div
                style={{
                  ...styles.gridLine,
                  top: '75%',
                }}
              />

              <div
                style={{
                  ...styles.gridLine,
                  top: '100%',
                }}
              />

              <svg
                viewBox="0 0 500 200"
                preserveAspectRatio="none"
                style={styles.chartSvg}
              >
                <path
                  d={generateSvgPath('temperature')}
                  fill="none"
                  stroke={
                    SENSOR_CONFIG.temperature.color
                  }
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={isConnected ? 1 : 0.4}
                />

                <path
                  d={generateSvgPath('humidity')}
                  fill="none"
                  stroke={
                    SENSOR_CONFIG.humidity.color
                  }
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={isConnected ? 1 : 0.4}
                />

                <path
                  d={generateSvgPath('light')}
                  fill="none"
                  stroke={
                    SENSOR_CONFIG.light.color
                  }
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={isConnected ? 1 : 0.4}
                />
              </svg>
            </div>

            <div style={styles.chartXAxis}>
              {history.length === 0 ? (
                <span>Đang chờ dữ liệu...</span>
              ) : (
                history.map((item, idx) => {
                  const showLabel =
                    idx === history.length - 1 ||
                    idx % 4 === 0;

                  const currentPosPct =
                    history.length === 1
                      ? 100
                      : (idx /
                        (history.length - 1)) *
                      100;

                  return (
                    <span
                      key={item.timestamp}
                      style={{
                        position: 'absolute',
                        left: `${currentPosPct}%`,
                        transform:
                          'translateX(-50%)',
                        opacity: showLabel ? 1 : 0,
                        whiteSpace: 'nowrap',
                        transition:
                          'left 0.3s ease-in-out',
                      }}
                    >
                      {formatChartTime(
                        item.timestamp
                      )}
                    </span>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div style={styles.controlCard}>
          <h3 style={styles.cardTitle}>
            Trung tâm điều khiển
          </h3>

          <div style={styles.ledList}>
            {(
              [
                'led1',
                'led2',
                'led3',
                'led4',
              ] as LEDId[]
            ).map((id, index) => {
              const isOn = ledStates[id];
              const isLoading = loadingLed[id];

              return (
                <div
                  key={id}
                  style={styles.ledRow}
                >
                  <div style={styles.ledInfo}>
                    <div
                      style={{
                        ...styles.ledIconBox,
                        background: isOn ? '#dcfce7' : '#f1f5f9',
                        borderColor: isOn ? '#bbf7d0' : '#e2e8f0',
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill={isOn ? '#16a34a' : 'none'}
                        stroke={isOn ? '#16a34a' : '#64748b'}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          filter: isOn
                            ? 'drop-shadow(0 0 4px rgba(22, 163, 74, 0.7))'
                            : 'none',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {/* Bóng đèn */}
                        <path d="M9 18h6" />
                        <path d="M10 22h4" />

                        <path
                          d="M8.5 14.5C7.55 13.55 7 12.3 7 11a5 5 0 0 1 10 0c0 1.3-.55 2.55-1.5 3.5-.75.75-1.5 1.35-1.5 2.5h-4c0-1.15-.75-1.75-1.5-2.5Z"
                        />

                        {/* Tia sáng khi bật */}
                        {isOn && (
                          <>
                            <path d="M12 2v1.5" />
                            <path d="M4.93 4.93L6 6" />
                            <path d="M19.07 4.93L18 6" />
                            <path d="M3 11h1.5" />
                            <path d="M19.5 11H21" />
                          </>
                        )}
                      </svg>
                    </div>

                    <span style={styles.ledName}>
                      Đèn LED {index + 1}
                    </span>

                    <span
                      style={{
                        ...styles.statusTag,
                        color: isOn ? '#15803d' : '#64748b',
                        background: isOn ? '#dcfce7' : '#f1f5f9',
                      }}
                    >
                      {isOn ? 'BẬT' : 'TẮT'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleLED(id)}
                    disabled={isLoading}
                    style={{
                      ...styles.switchBtn,
                      background: isOn
                        ? '#16a34a'
                        : '#cbd5e1',
                      opacity: isLoading ? 0.7 : 1,
                      cursor: isLoading
                        ? 'not-allowed'
                        : 'pointer',
                    }}
                  >
                    <div
                      style={{
                        ...styles.switchThumb,
                        transform: isOn
                          ? 'translateX(20px)'
                          : 'translateX(0px)',
                      }}
                    >
                      {isLoading && (
                        <div style={styles.spinner} />
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(12px, 1.8vw, 24px)',
    width: '100%',
    height: '100%',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
    position: 'relative',
    boxSizing: 'border-box',
  },

  disconnectBanner: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding:
      'clamp(8px, 1vw, 12px) clamp(10px, 1.2vw, 16px)',
    color: '#b91c1c',
    fontSize:
      'clamp(11px, 0.85vw, 14px)',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
    boxSizing: 'border-box',
  },

  disconnectDot: {
    width: '10px',
    height: '10px',
    minWidth: '10px',
    borderRadius: '50%',
    backgroundColor: '#dc2626',
    display: 'inline-block',
    animation: 'pulse 1.5s infinite',
  },

  toast: {
    position: 'fixed',
    top: 'clamp(10px, 2vw, 20px)',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    maxWidth: 'min(90vw, 600px)',
    padding:
      'clamp(8px, 1vw, 12px) clamp(12px, 2vw, 24px)',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize:
      'clamp(11px, 0.85vw, 14px)',
    fontWeight: 600,
    boxShadow:
      '0 8px 24px rgba(15, 23, 42, 0.16)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    animation:
      'slideDown 0.3s ease-out forwards',
    boxSizing: 'border-box',
  },

  toastIcon: {
    fontSize: '16px',
    fontWeight: 'bold',
    flexShrink: 0,
  },

  cardsRow: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(3, minmax(0, 1fr))',
    gap:
      'clamp(8px, 1.5vw, 24px)',
    minWidth: 0,
    flexShrink: 0,
  },

  card: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    boxShadow:
      '0 2px 8px rgba(15, 23, 42, 0.05)',
    borderRadius: '12px',
    padding:
      'clamp(10px, 1.5vw, 24px)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    transition: 'opacity 0.3s ease',
    minWidth: 0,
    boxSizing: 'border-box',
    overflow: 'hidden',
  },

  cardLabel: {
    fontSize:
      'clamp(9px, 0.75vw, 12px)',
    fontWeight: 700,
    color: '#6b7280',
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  cardValGroup: {
    display: 'flex',
    alignItems: 'baseline',
    gap:
      'clamp(4px, 0.5vw, 8px)',
    minWidth: 0,
  },

  cardVal: {
    fontSize:
      'clamp(22px, 2.5vw, 36px)',
    fontWeight: 700,
    color: '#111827',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },

  cardUnit: {
    fontSize:
      'clamp(12px, 1.4vw, 20px)',
    color: '#6b7280',
    fontWeight: 400,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },

  gridContainer: {
    display: 'grid',
    gridTemplateColumns:
      'minmax(0, 2fr) minmax(180px, 1fr)',
    gap:
      'clamp(8px, 1.5vw, 24px)',
    minWidth: 0,
    minHeight: 0,
    flex: '1 1 auto',
    overflow: 'hidden',
  },

  chartCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    boxShadow:
      '0 2px 8px rgba(15, 23, 42, 0.05)',
    borderRadius: '12px',
    padding:
      'clamp(12px, 1.5vw, 24px)',
    display: 'flex',
    flexDirection: 'column',
    gap:
      'clamp(12px, 1.5vw, 24px)',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
  },

  chartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    minWidth: 0,
    flexShrink: 0,
  },

  cardTitle: {
    margin: 0,
    fontSize:
      'clamp(14px, 1.25vw, 18px)',
    fontWeight: 700,
    color: '#111827',
    minWidth: 0,
  },

  legendGroup: {
    display: 'flex',
    gap:
      'clamp(8px, 1vw, 16px)',
    flexWrap: 'wrap',
    minWidth: 0,
  },

  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: 0,
  },

  legendDot: {
    width: '8px',
    height: '8px',
    minWidth: '8px',
    borderRadius: '50%',
  },

  legendText: {
    fontSize:
      'clamp(9px, 0.75vw, 12px)',
    color: '#6b7280',
    whiteSpace: 'nowrap',
  },

  chartBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: '1 1 auto',
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden',
  },

  chartGridLines: {
    position: 'relative',
    height:
      'clamp(180px, 30vh, 500px)',
    minHeight: 0,
    borderLeft: '1px solid #e5e7eb',
    borderBottom: '1px solid #e5e7eb',
    minWidth: 0,
    overflow: 'hidden',
  },

  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '1px',
    background: '#f1f5f9',
  },

  chartSvg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    overflow: 'visible',
  },

  chartXAxis: {
    position: 'relative',
    height: '20px',
    minHeight: '20px',
    fontSize:
      'clamp(8px, 0.65vw, 10px)',
    color: '#6b7280',
    overflow: 'hidden',
    minWidth: 0,
    flexShrink: 0,
  },

  controlCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    boxShadow:
      '0 2px 8px rgba(15, 23, 42, 0.05)',
    borderRadius: '12px',
    padding:
      'clamp(12px, 1.5vw, 24px)',
    display: 'flex',
    flexDirection: 'column',
    gap:
      'clamp(12px, 1.5vw, 24px)',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
  },

  ledList: {
    display: 'flex',
    flexDirection: 'column',
    gap:
      'clamp(6px, 0.8vw, 12px)',
    minWidth: 0,
    overflow: 'auto',
  },

  ledRow: {
    background: '#f8fafc',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding:
      'clamp(8px, 1vw, 12px) clamp(8px, 1.2vw, 16px)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
    boxSizing: 'border-box',
  },

  ledInfo: {
    display: 'flex',
    alignItems: 'center',
    gap:
      'clamp(6px, 0.8vw, 12px)',
    minWidth: 0,
    overflow: 'hidden',
  },

  ledIconBox: {
    width:
      'clamp(28px, 2.5vw, 36px)',
    height:
      'clamp(28px, 2.5vw, 36px)',
    minWidth: '28px',
    borderRadius: '8px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  ledIndicator: {
    width: '10px',
    height: '10px',
    minWidth: '10px',
    borderRadius: '50%',
    transition: 'all 0.3s ease',
  },

  ledName: {
    fontSize:
      'clamp(10px, 0.9vw, 14px)',
    fontWeight: 600,
    color: '#111827',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },

  statusTag: {
    fontSize:
      'clamp(8px, 0.65vw, 10px)',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },

  switchBtn: {
    width: '44px',
    minWidth: '44px',
    height: '24px',
    borderRadius: '12px',
    border: 'none',
    padding: '2px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'background 0.3s ease',
    flexShrink: 0,
  },

  switchThumb: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#ffffff',
    boxShadow:
      '0 1px 3px rgba(15, 23, 42, 0.2)',
    transition: 'transform 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  spinner: {
    width: '12px',
    height: '12px',
    border: '2px solid #e2e8f0',
    borderTop: '2px solid #0284c7',
    borderRadius: '50%',
    animation:
      'spin 0.8s linear infinite',
  },
};

export default Dashboard; 
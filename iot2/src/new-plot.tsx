import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const ALERT_THRESHOLD_PCT = 50;

interface SensorConfig {
  id: string;
  name: string;
  unit: string;
  color: string;
  min: number;
  max: number;
}

const SENSORS: SensorConfig[] = [
  { id: 'gas', name: 'Khí gas', unit: '%', color: '#dc2626', min: 0, max: 100 },
  { id: 'smoke', name: 'Khói', unit: '%', color: '#ea580c', min: 0, max: 100 },
  { id: 'motion', name: 'Chuyển động', unit: '%', color: '#2563eb', min: 0, max: 100 },
];

interface SensorReading {
  sensorId: string;
  value: number;
  timestamp: number;
}

interface LedState {
  id: string;
  on: boolean;
  blinking: boolean;
}

interface AlertRecord {
  time: string;
  sensor: string;
  value: number;
}

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function getStoredAlerts(): AlertRecord[] {
  try {
    const raw = localStorage.getItem('newplot_alerts');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveAlert(alert: AlertRecord) {
  const alerts = getStoredAlerts();
  alerts.push(alert);
  localStorage.setItem('newplot_alerts', JSON.stringify(alerts));
}

function getTodayAlertCount(): number {
  const today = getTodayKey();
  return getStoredAlerts().filter((a) => a.time.startsWith(today)).length;
}

export function NewPlot() {
  const navigate = useNavigate();

  const [sensorValues, setSensorValues] = useState<Record<string, number>>({
    gas: 0,
    smoke: 0,
    motion: 0,
  });

  const [sensorRanges, setSensorRanges] = useState<Record<string, { min: number; max: number }>>({
    gas: { min: 0, max: 100 },
    smoke: { min: 0, max: 100 },
    motion: { min: 0, max: 100 },
  });

  const [ledStates, setLedStates] = useState<LedState[]>([
    { id: 'led5', on: false, blinking: false },
    { id: 'led6', on: false, blinking: false },
    { id: 'led7', on: false, blinking: false },
  ]);

  const [mqttConnected, setMqttConnected] = useState(false);
  const [alertBanner, setAlertBanner] = useState<{ active: boolean; sensorId: string; value: number } | null>(null);
  const [todayAlertCount, setTodayAlertCount] = useState(0);
  const [blinkTick, setBlinkTick] = useState(0);

  const clientRef = useRef<any>(null);
  const blinkRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertActiveRef = useRef<Record<string, boolean>>({
    gas: false,
    smoke: false,
    motion: false,
  });
  const ledStatesRef = useRef<LedState[]>([
    { id: 'led5', on: false, blinking: false },
    { id: 'led6', on: false, blinking: false },
    { id: 'led7', on: false, blinking: false },
  ]);

  const sensorIndexById: Record<string, number> = {
    gas: 0,
    smoke: 1,
    motion: 2,
  };

  const ledIdBySensor: Record<string, string> = {
    gas: 'led5',
    smoke: 'led6',
    motion: 'led7',
  };

  useEffect(() => {
    setTodayAlertCount(getTodayAlertCount());
  }, []);

  useEffect(() => {
    const hasBlinking = ledStates.some((l) => l.blinking);
    if (hasBlinking) {
      blinkRef.current = setInterval(() => {
        setBlinkTick((t) => t + 1);
      }, 500);
    } else {
      if (blinkRef.current) {
        clearInterval(blinkRef.current);
        blinkRef.current = null;
      }
    }
  }, [ledStates]);

  const connectMqtt = useCallback(() => {
    try {
      const stompClient = new Client({
        webSocketFactory: () =>
          new SockJS('http://localhost:8080/ws/dashboard'),

        reconnectDelay: 5000,

        onConnect: () => {
          setMqttConnected(true);

          stompClient.subscribe('/topic/dashboard', (message) => {
            try {
              const body = JSON.parse(message.body);

              const gasRaw = body.gas ?? body.GAS ?? null;
              const smokeRaw = body.smoke ?? body.SMOKE ?? null;
              const motionRaw = body.motion ?? body.MOTION ?? null;

              const nextValues = { ...sensorValues };
              const nextLed = ledStatesRef.current.map((led) => ({ ...led }));
              const nextAlert = { ...alertActiveRef.current };
              let hasValueUpdate = false;
              let hasLedUpdate = false;
              const newAlerts: Array<{ sensorId: string; value: number }> = [];

              const processSensor = (
                raw: unknown,
                id: string,
                sensorId: string,
                ledId: string,
                alertKey: 'gas' | 'smoke' | 'motion'
              ) => {
                if (raw === null || !Number.isFinite(Number(raw))) {
                  return;
                }
                const val = Number(raw);
                nextValues[id] = val;
                hasValueUpdate = true;

                const range =
                  sensorRanges[id] || { min: 0, max: 100 };
                const pct =
                  range.max > 0 ? (val / range.max) * 100 : 0;

                if (pct > ALERT_THRESHOLD_PCT) {
                  if (!nextAlert[alertKey]) {
                    newAlerts.push({ sensorId, value: val });
                    nextAlert[alertKey] = true;
                  }
                  const ledIdx = nextLed.findIndex((l) => l.id === ledId);
                  if (ledIdx >= 0 && !nextLed[ledIdx].blinking) {
                    nextLed[ledIdx].blinking = true;
                    hasLedUpdate = true;
                  }
                } else {
                  nextAlert[alertKey] = false;
                  const ledIdx = nextLed.findIndex((l) => l.id === ledId);
                  if (
                    ledIdx >= 0 &&
                    (nextLed[ledIdx].blinking || nextLed[ledIdx].on)
                  ) {
                    nextLed[ledIdx].blinking = false;
                    nextLed[ledIdx].on = false;
                    hasLedUpdate = true;
                  }
                }
              };

              processSensor(gasRaw, 'gas', 'Khí gas', 'led5', 'gas');
              processSensor(smokeRaw, 'smoke', 'Khói', 'led6', 'smoke');
              processSensor(motionRaw, 'motion', 'Chuyển động', 'led7', 'motion');

              if (hasValueUpdate) {
                setSensorValues(nextValues);
              }
              if (hasLedUpdate) {
                ledStatesRef.current = nextLed;
                setLedStates(nextLed);
              }
              alertActiveRef.current = nextAlert;
              newAlerts.forEach((alertItem) => {
                setAlertBanner({ active: true, ...alertItem });

                const alert: AlertRecord = {
                  time: new Date().toISOString(),
                  sensor:
                    SENSORS.find((s) => s.id === alertItem.sensorId)?.name ||
                    alertItem.sensorId,
                  value: alertItem.value,
                };
                saveAlert(alert);
                setTodayAlertCount(getTodayAlertCount());
              });
            } catch {
              // ignore malformed messages
            }
          });
        },

        onDisconnect: () => {
          setMqttConnected(false);
        },

        onStompError: () => {
          setMqttConnected(false);
        },
      });

      clientRef.current = stompClient;

      stompClient.activate();

      return () => {
        stompClient.deactivate();
      };
    } catch {
      setMqttConnected(false);
    }
  }, [sensorRanges]);

  useEffect(() => {
    connectMqtt();
  }, [connectMqtt]);

  const acknowledgeAlert = () => {
    setAlertBanner(null);
    setLedStates((prev) =>
      prev.map((led) => ({ ...led, blinking: false, on: false }))
    );
  };

  const toggleLedManual = (ledId: string) => {
    setLedStates((prev) =>
      prev.map((led) =>
        led.id === ledId ? { ...led, on: !led.on, blinking: false } : led
      )
    );
  };

  const isLedVisible = (led: LedState) => {
    if (!led.blinking) return led.on;
    return blinkTick % 2 === 0;
  };

  const getLedColor = (sensorId: string) => {
    const s = SENSORS.find((s) => s.id === sensorId);
    return s ? s.color : '#6b7280';
  };

  const activeAlerts = ledStates.filter((l) => l.blinking).length;

  return (
    <div style={styles.container}>
      <div style={styles.sensorsGrid}>
        {/* Hàng trên: 3 giá trị cảm biến */}
        {SENSORS.map((sensor, index) => {
          const value = sensorValues[sensor.id] ?? 0;
          const range = sensorRanges[sensor.id] || { min: 0, max: sensor.max };
          const pct = range.max > 0 ? (value / range.max) * 100 : 0;
          const isOver = pct > ALERT_THRESHOLD_PCT;

          return (
            <div
              key={`sensor-${sensor.id}`}
              style={{
                ...styles.box,
                background: isOver
                  ? `rgba(${hexToRgb(sensor.color)}, 0.15)`
                  : '#ffffff',
                border: `2px solid ${isOver ? sensor.color : '#e5e7eb'}`,
              }}
            >
              <div style={styles.boxLabel}>{sensor.name}</div>
              <div style={styles.boxValue}>
                {value.toFixed(1)}{sensor.unit}
              </div>
              <div style={styles.boxPct}>
                {pct.toFixed(0)}% / {range.max.toFixed(0)}
              </div>
              {isOver && (
                <div style={styles.boxAlert}>
                </div>
              )}
            </div>
          );
        })}

        {/* Hàng dưới: 3 biểu tượng đèn (mặc định tắt, nháy khi cảnh báo) */}
        {ledStates.map((led, index) => {
          const sensor = SENSORS[index];
          const isBlinking = led.blinking && blinkTick % 2 === 0;
          const isLedOn = isBlinking || led.on;

          return (
            <div
              key={`led-${led.id}`}
              style={{
                ...styles.box,
                background: isLedOn ? sensor.color : '#f3f4f6',
                border: `2px solid ${isLedOn ? sensor.color : '#e5e7eb'}`,
              }}
            >
              <div style={styles.boxIcon}>
                <span style={{ fontSize: 'clamp(24px, 3vw, 32px)' }}>
                  💡
                </span>
              </div>
              <div style={styles.boxLabel}>LED {index + 5}</div>
              <div style={styles.boxPct}>
                {led.blinking ? 'NHÁY CẢNH BÁO' : 'BÌNH THƯỜNG'}
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.historyCard}>
        <h2 style={styles.historyTitle}>Thống kê số lần cảnh báo</h2>
        <div style={styles.historyList}>
          {(() => {
            const alerts = getStoredAlerts();
            const byDay = new Map<string, Record<string, number>>();
            alerts.forEach((a) => {
              const day = a.time.split('T')[0];
              if (!byDay.has(day)) {
                byDay.set(day, {});
              }
              const counts = byDay.get(day)!;
              counts[a.sensor] = (counts[a.sensor] || 0) + 1;
            });
            const days = Array.from(byDay.keys()).sort(
              (a, b) => b.localeCompare(a)
            );
            if (days.length === 0) {
              return (
                <div style={styles.emptyHistory}>
                  Chưa có cảnh báo nào.
                </div>
              );
            }
            const sensorConfig: Array<{ key: string; label: string }> = [
              { key: 'Khí gas', label: 'Khí gas' },
              { key: 'Khói', label: 'Khói' },
              { key: 'Chuyển động', label: 'Chuyển động' },
            ];
            return (
              <div style={styles.historyColumns}>
                {sensorConfig.map(({ key, label }) => {
                  return (
                    <div key={key} style={styles.historyColumn}>
                      <div style={styles.historyColumnTitle}>{label}</div>
                      {days.map((day) => {
                        const count =
                          byDay.get(day)?.[key] || 0;
                        if (count === 0) {
                          return null;
                        }
                        return (
                          <div
                            key={`${day}-${key}`}
                            style={styles.historyItem}
                          >
                            <span style={styles.historyTime}>
                              {new Date(
                                `${day}T00:00:00`
                              ).toLocaleDateString('vi-VN')}
                            </span>
                            <span style={styles.historyValue}>
                              {count} lần
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
        result[3],
        16
      )}`
    : '0, 0, 0';
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(12px, 1.8vw, 24px)',
    width: '100%',
    height: '100%',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
    padding: 'clamp(14px, 3vw, 40px) clamp(14px, 3.5vw, 48px)',
    background: '#f5f7fb',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 'clamp(8px, 1vw, 16px)',
    minWidth: 0,
  },

  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'transparent',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: 'clamp(6px, 0.8vw, 10px) clamp(10px, 1.2vw, 16px)',
    color: '#6b7280',
    fontSize: 'clamp(11px, 0.9vw, 13px)',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },

  title: {
    margin: 0,
    fontSize: 'clamp(20px, 2.5vw, 28px)',
    fontWeight: 700,
    color: '#111827',
    letterSpacing: '-0.5px',
  },

  mqttStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: 'clamp(11px, 0.9vw, 13px)',
    color: '#6b7280',
    fontWeight: 500,
  },

  statusDot: {
    width: '8px',
    height: '8px',
    minWidth: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  },

  statusText: {
    whiteSpace: 'nowrap',
  },

  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 'clamp(10px, 1.5vw, 16px)',
    minWidth: 0,
  },

  statCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: 'clamp(14px, 2vw, 20px)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    boxSizing: 'border-box',
    minWidth: 0,
  },

  statLabel: {
    fontSize: 'clamp(10px, 0.8vw, 12px)',
    color: '#6b7280',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },

  statValue: {
    fontSize: 'clamp(20px, 2.5vw, 28px)',
    fontWeight: 700,
    color: '#111827',
  },

  alertBanner: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    padding: 'clamp(10px, 1.5vw, 16px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'clamp(12px, 2vw, 20px)',
    animation: 'slideDown 0.3s ease-out forwards',
    boxSizing: 'border-box',
    minWidth: 0,
  },

  alertIcon: {
    fontSize: 'clamp(24px, 3vw, 32px)',
    flexShrink: 0,
  },

  alertContent: {
    minWidth: 0,
    flex: 1,
  },

  alertTitle: {
    fontSize: 'clamp(13px, 1.2vw, 15px)',
    fontWeight: 700,
    color: '#dc2626',
    margin: 0,
  },

  alertValue: {
    fontSize: 'clamp(11px, 1vw, 13px)',
    color: '#6b7280',
    margin: '2px 0 0 0',
  },

  alertDismissBtn: {
    background: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: 'clamp(11px, 0.9vw, 13px)',
    fontWeight: 600,
    padding: 'clamp(6px, 0.8vw, 10px) clamp(12px, 1.5vw, 18px)',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.2s ease',
    whiteSpace: 'nowrap',
  },

  sensorsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 'clamp(10px, 1.5vw, 16px)',
    minWidth: 0,
  },

  box: {
    background: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '16px',
    padding: 'clamp(14px, 2vw, 20px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'clamp(8px, 1vw, 12px)',
    boxSizing: 'border-box',
    minWidth: 0,
    textAlign: 'center',
    transition: 'all 0.3s ease',
  },

  boxIcon: {
    fontSize: 'clamp(24px, 3vw, 32px)',
    marginBottom: '4px',
  },

  boxLabel: {
    fontSize: 'clamp(13px, 1.3vw, 16px)',
    fontWeight: 700,
    color: '#111827',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },

  boxValue: {
    fontSize: 'clamp(20px, 2.5vw, 28px)',
    fontWeight: 800,
    color: '#374151',
    fontFamily: "'JetBrains Mono', monospace",
    margin: 0,
  },

  boxPct: {
    fontSize: 'clamp(11px, 0.95vw, 13px)',
    color: '#6b7280',
    fontFamily: "'JetBrains Mono', monospace",
    margin: 0,
  },

  boxAlert: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: '#fef2f2',
    border: '1px solid #fca5a5',
    borderRadius: '20px',
    color: '#dc2626',
    fontSize: 'clamp(10px, 0.85vw, 12px)',
    fontWeight: 800,
    padding: 'clamp(2px, 0.4vw, 6px) clamp(8px, 1vw, 12px)',
    marginTop: '4px',
    animation: 'pulse 1.5s infinite',
  },

  historyCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: 'clamp(14px, 2vw, 20px)',
    boxSizing: 'border-box',
    minWidth: 0,
  },

  historyTitle: {
    margin: '0 0 clamp(12px, 1.8vw, 16px) 0',
    fontSize: 'clamp(16px, 1.8vw, 20px)',
    fontWeight: 700,
    color: '#111827',
  },

  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: 'clamp(200px, 25vw, 300px)',
    overflowY: 'auto',
  },

  historyColumns: {
    display: 'flex',
    gap: 'clamp(8px, 1vw, 12px)',
    flexWrap: 'wrap',
    minWidth: 0,
  },

  historyColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: 'clamp(140px, 25vw, 200px)',
    flex: 1,
  },

  historyColumnTitle: {
    fontSize: 'clamp(12px, 1vw, 14px)',
    fontWeight: 700,
    color: '#dc2626',
    marginBottom: 'clamp(4px, 0.5vw, 6px)',
    textAlign: 'center',
    borderBottom: '2px solid #fee2e2',
    paddingBottom: 'clamp(2px, 0.3vw, 4px)',
  },

  historyItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'clamp(6px, 0.8vw, 10px)',
    borderRadius: '8px',
    background: '#f8fafc',
    gap: 'clamp(8px, 1vw, 14px)',
  },

  historyTime: {
    fontSize: 'clamp(11px, 0.9vw, 13px)',
    fontFamily: "'JetBrains Mono', monospace",
    whiteSpace: 'nowrap',
  },

  historySensor: {
    fontSize: 'clamp(11px, 0.9vw, 13px)',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  historyValue: {
    fontSize: 'clamp(11px, 0.9vw, 13px)',
    fontFamily: "'JetBrains Mono', monospace",
    whiteSpace: 'nowrap',
  },

  emptyHistory: {
    fontSize: 'clamp(12px, 1vw, 14px)',
    color: '#9ca3af',
    textAlign: 'center',
    padding: 'clamp(20px, 3vw, 32px)',
  },
};

export default NewPlot;
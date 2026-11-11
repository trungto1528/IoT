import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axios from 'axios';

type SensorValue = number | null;

interface SensorData {
  temperature: SensorValue;
  humidity: SensorValue;
  light: SensorValue;
}

interface HistoryPoint extends SensorData {
  timestamp: string;
}

const toReading = (
  value: unknown
): SensorValue => {
  const numeric = Number(value);

  return Number.isFinite(numeric) &&
    numeric > 0
    ? numeric
    : null;
};

interface SensorApiRecord {
  id: number;
  type: string;
  value: number;
  time: string;
}

interface SensorApiResponse {
  content: SensorApiRecord[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
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
    max: 8000,
    color: '#08983f',
  },
};

const Y_AXIS_TICKS = [
  0, 20, 40, 60, 80, 100,
];

const CHART_WIDTH = 500;
const CHART_HEIGHT = 200;
const CHART_PADDING = 10;

const CHART_TOP_PERCENT =
  (CHART_PADDING / CHART_HEIGHT) * 100;

const CHART_PLOT_PERCENT =
  100 - CHART_TOP_PERCENT * 2;

const getPlotTopPercent = (
  percent: number
): number =>
  CHART_TOP_PERCENT +
  (percent / 100) *
    CHART_PLOT_PERCENT;

const getAxisValue = (
  key: keyof typeof SENSOR_CONFIG,
  percent: number
): number => {
  const { min, max } =
    SENSOR_CONFIG[key];

  return Math.round(
    max - (percent / 100) * (max - min)
  );
};

const clampRatio = (
  value: number,
  min: number,
  max: number
): number => {
  if (max <= min) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(1, (value - min) / (max - min))
  );
};

const mixHexColors = (
  from: string,
  to: string,
  ratio: number
): string => {
  const fromHex = from.replace('#', '');
  const toHex = to.replace('#', '');

  const channels = [0, 2, 4].map(
    (index) => {
      const start = parseInt(
        fromHex.substring(index, index + 2),
        16
      );

      const end = parseInt(
        toHex.substring(index, index + 2),
        16
      );

      return Math.round(
        start + (end - start) * ratio
      );
    }
  );

  return `rgb(${channels.join(', ')})`;
};

const getValueGradient = (
  value: number,
  min: number,
  max: number,
  startColor: string,
  lowColor: string,
  highColor: string
): string => {
  const ratio = clampRatio(value, min, max);

  const endColor = mixHexColors(
    lowColor,
    highColor,
    ratio
  );

  return `linear-gradient(135deg, ${startColor} 0%, ${endColor} 100%)`;
};

const MAX_HISTORY_LENGTH = 30;

/*
 * Mỗi lần MQTT gửi 1 gói sẽ tạo 3 record trong DB:
 *
 * temp
 * humid
 * light
 *
 * Vì vậy:
 *
 * 30 điểm biểu đồ x 3 sensor = 90 records.
 */
const HISTORY_API_SIZE =
  MAX_HISTORY_LENGTH * 3;

export function Dashboard() {
  const navigate = useNavigate();

  const [sensorData, setSensorData] =
    useState<SensorData>({
      temperature: null,
      humidity: null,
      light: null,
    });

  const [history, setHistory] =
    useState<HistoryPoint[]>([]);

  const [hoverIndex, setHoverIndex] =
    useState<number | null>(null);

  const [ledStates, setLedStates] =
    useState<Record<LEDId, boolean>>({
      led1: false,
      led2: false,
      led3: false,
      led4: false,
    });

  const [loadingLed, setLoadingLed] =
    useState<Record<LEDId, boolean>>({
      led1: false,
      led2: false,
      led3: false,
      led4: false,
    });

  const [isConnected, setIsConnected] =
    useState<boolean>(true);

  const timeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  const [toast, setToast] =
    useState<ToastNotification | null>(
      null
    );

  const showToast = (
    message: string,
    type: 'success' | 'error'
  ) => {
    const toastId = Date.now();

    setToast({
      id: toastId,
      message,
      type,
    });

    setTimeout(() => {
      setToast((current) =>
        current?.id === toastId
          ? null
          : current
      );
    }, 3000);
  };

  const resetConnectionTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(
        timeoutRef.current
      );
    }

    setIsConnected(true);

    timeoutRef.current =
      setTimeout(() => {
        setIsConnected(false);
      }, 5000);
  };

  /*
   * Chuyển timestamp API thành timestamp dùng
   * làm key cho history.
   *
   * Backend lưu cả 3 sensor cùng một LocalDateTime,
   * nên 3 record có cùng timestamp sẽ được gom
   * thành một HistoryPoint.
   */
  const normalizeTimestamp = (
    value: string
  ): string => {
    return value;
  };

  /*
   * Gom các record:
   *
   * TEMP
   * HUMID
   * LIGHT
   *
   * có cùng timestamp thành:
   *
   * {
   *   temperature,
   *   humidity,
   *   light,
   *   timestamp
   * }
   */
  const buildHistoryFromApi = (
    records: SensorApiRecord[]
  ): HistoryPoint[] => {
    const grouped =
      new Map<string, HistoryPoint>();

    /*
     * API đang trả mới -> cũ.
     *
     * Ta duyệt ngược để tạo thứ tự:
     * cũ -> mới.
     */
    const orderedRecords =
      [...records].reverse();

    orderedRecords.forEach(
      (record) => {
        const value =
          toReading(record.value);

        if (value === null) {
          return;
        }

        const timestamp =
          normalizeTimestamp(
            record.time
          );

        const existing =
          grouped.get(timestamp);

        if (existing) {
          if (
            record.type === 'temp' ||
            record.type === 'TEMP'
          ) {
            existing.temperature =
              value;
          }

          if (
            record.type === 'humid' ||
            record.type === 'HUMID'
          ) {
            existing.humidity =
              value;
          }

          if (
            record.type === 'light' ||
            record.type === 'LIGHT'
          ) {
            existing.light =
              value;
          }

          return;
        }

        const point: HistoryPoint = {
          temperature: null,
          humidity: null,
          light: null,
          timestamp,
        };

        if (
          record.type === 'temp' ||
          record.type === 'TEMP'
        ) {
          point.temperature =
            value;
        }

        if (
          record.type === 'humid' ||
          record.type === 'HUMID'
        ) {
          point.humidity =
            value;
        }

        if (
          record.type === 'light' ||
          record.type === 'LIGHT'
        ) {
          point.light =
            value;
        }

        grouped.set(
          timestamp,
          point
        );
      }
    );

    return Array.from(
      grouped.values()
    ).slice(
      -MAX_HISTORY_LENGTH
    );
  };

  /*
   * Khi Dashboard mở lại:
   *
   * chỉ lấy 90 record mới nhất.
   *
   * 90 / 3 = 30 điểm biểu đồ.
   */
  const loadInitialHistory =
    async () => {
      try {
        const response =
          await axios.get<SensorApiResponse>(
            'http://localhost:8080/api/sensor-data',
            {
              params: {
                page: 0,
                size: HISTORY_API_SIZE,
                sort: 'time,desc',
              },
            }
          );

        const records =
          response.data.content ?? [];

        const loadedHistory =
          buildHistoryFromApi(
            records
          );

        if (
          loadedHistory.length > 0
        ) {
          setHistory(
            (currentHistory) => {
              /*
               * Có thể WebSocket đã nhận dữ liệu
               * trong lúc API đang tải.
               *
               * Merge DB + dữ liệu realtime,
               * tránh làm mất dữ liệu vừa nhận.
               */
              const merged =
                new Map<
                  string,
                  HistoryPoint
                >();

              const mergePoint = (
                base: HistoryPoint,
                incoming: HistoryPoint
              ): HistoryPoint => ({
                timestamp: base.timestamp,

                temperature:
                  incoming.temperature ??
                  base.temperature,

                humidity:
                  incoming.humidity ??
                  base.humidity,

                light:
                  incoming.light ??
                  base.light,
              });

              loadedHistory.forEach(
                (point) => {
                  merged.set(
                    point.timestamp,
                    point
                  );
                }
              );

              currentHistory.forEach(
                (point) => {
                  const existing =
                    merged.get(
                      point.timestamp
                    );

                  merged.set(
                    point.timestamp,
                    existing
                      ? mergePoint(
                          existing,
                          point
                        )
                      : point
                  );
                }
              );

              const result =
                Array.from(
                  merged.values()
                )
                  .sort(
                    (a, b) =>
                      new Date(
                        a.timestamp
                      ).getTime() -
                      new Date(
                        b.timestamp
                      ).getTime()
                  )
                  .slice(
                    -MAX_HISTORY_LENGTH
                  );

              const latest =
                result[
                  result.length - 1
                ];

              if (latest) {
                setSensorData(
                  (current) => ({
                    temperature:
                      latest.temperature ??
                      current.temperature,

                    humidity:
                      latest.humidity ??
                      current.humidity,

                    light:
                      latest.light ??
                      current.light,
                  })
                );
              }

              return result;
            }
          );
        }
      } catch (error) {
        console.error(
          'Không thể lấy lịch sử cảm biến:',
          error
        );
      }
    };

  useEffect(() => {
    const isLoggedIn =
      localStorage.getItem(
        'isLoggedIn'
      );

    if (isLoggedIn !== 'true') {
      navigate('/');
      return;
    }

    axios
      .get(
        'http://localhost:8080/api/dashboard/led'
      )
      .then((res) => {
        if (res.data) {
          setLedStates({
            led1: !!res.data.led1,
            led2: !!res.data.led2,
            led3: !!res.data.led3,
            led4: !!res.data.led4,
          });
        }
      })
      .catch((err) => {
        console.warn(
          'Chưa lấy được trạng thái đèn ban đầu:',
          err.message
        );
      });

    /*
     * Lấy lịch sử ngay khi Dashboard mount.
     */
    loadInitialHistory();
  }, [navigate]);

  useEffect(() => {
    const isLoggedIn =
      localStorage.getItem(
        'isLoggedIn'
      );

    if (isLoggedIn !== 'true') {
      return;
    }

    resetConnectionTimeout();

    const stompClient =
      new Client({
        webSocketFactory: () =>
          new SockJS(
            'http://localhost:8080/ws/dashboard'
          ),

        reconnectDelay: 5000,

        onConnect: () => {
          resetConnectionTimeout();

          stompClient.subscribe(
            '/topic/dashboard',
            (message) => {
              try {
                resetConnectionTimeout();

                const body =
                  JSON.parse(
                    message.body
                  );

                const newData: SensorData = {
                  temperature: toReading(
                    body.temp ??
                      body.temperature
                  ),

                  humidity: toReading(
                    body.humid ??
                      body.humidity
                  ),

                  light: toReading(
                    body.light
                  ),
                };

                if (
                  newData.temperature === null &&
                  newData.humidity === null &&
                  newData.light === null
                ) {
                  return;
                }

                /*
                 * Ưu tiên timestamp do thiết bị gửi.
                 *
                 * Backend cũng sử dụng timestamp này
                 * để lưu cả 3 sensor.
                 */
                let timestamp: string;

                const deviceTimestamp =
                  Number(body.timestamp);

                if (
                  Number.isFinite(
                    deviceTimestamp
                  ) &&
                  deviceTimestamp > 0
                ) {
                  timestamp =
                    new Date(
                      deviceTimestamp * 1000
                    ).toISOString();
                } else {
                  timestamp =
                    new Date().toISOString();
                }

                setSensorData(
                  (current) => ({
                    temperature:
                      newData.temperature ??
                      current.temperature,

                    humidity:
                      newData.humidity ??
                      current.humidity,

                    light:
                      newData.light ??
                      current.light,
                  })
                );

                setHistory(
                  (prevHistory) => {
                    const existing =
                      prevHistory.find(
                        (point) =>
                          point.timestamp ===
                          timestamp
                      );

                    /*
                     * Nếu cùng timestamp thì cập nhật
                     * điểm đó thay vì tạo điểm trùng.
                     */
                    const newPoint: HistoryPoint =
                      existing
                        ? {
                            timestamp,

                            temperature:
                              newData.temperature ??
                              existing.temperature,

                            humidity:
                              newData.humidity ??
                              existing.humidity,

                            light:
                              newData.light ??
                              existing.light,
                          }
                        : {
                            ...newData,
                            timestamp,
                          };

                    const filtered =
                      prevHistory.filter(
                        (point) =>
                          point.timestamp !==
                          timestamp
                      );

                    const updated = [
                      ...filtered,
                      newPoint,
                    ];

                    return updated
                      .sort(
                        (a, b) =>
                          new Date(
                            a.timestamp
                          ).getTime() -
                          new Date(
                            b.timestamp
                          ).getTime()
                      )
                      .slice(
                        -MAX_HISTORY_LENGTH
                      );
                  }
                );
              } catch (e) {
                console.error(
                  'Lỗi parse dữ liệu WebSocket:',
                  e
                );
              }
            }
          );
        },

        onDisconnect: () => {
          setIsConnected(false);
        },

        onStompError: () => {
          setIsConnected(false);
        },
      });

    stompClient.activate();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(
          timeoutRef.current
        );
      }

      stompClient.deactivate();
    };
  }, []);

  const toggleLED = async (
    ledId: LEDId
  ) => {
    if (loadingLed[ledId]) {
      return;
    }

    const storedUser =
      localStorage.getItem(
        'user'
      );

    let userId = 1;

    if (storedUser) {
      try {
        const parsedUser =
          JSON.parse(
            storedUser
          );

        if (parsedUser.id) {
          userId =
            parsedUser.id;
        }
      } catch (e) {
        console.error(
          'Lỗi đọc dữ liệu user:',
          e
        );
      }
    }

    const targetStatus =
      !ledStates[ledId];

    const ledNumber =
      LED_INDEX_MAP[ledId];

    setLoadingLed((prev) => ({
      ...prev,
      [ledId]: true,
    }));

    try {
      const response =
        await axios.post(
          'http://localhost:8080/api/dashboard/control',
          {
            targetNumber:
              ledNumber,

            actionVal:
              targetStatus ? 1 : 0,

            uid: userId,
          },
          {
            headers: {
              'Content-Type':
                'application/json',
            },
          }
        );

      if (
        response.data &&
        response.data.ledStatus
      ) {
        const ledStatus =
          response.data
            .ledStatus;

        const ledIndex =
          Number(
            ledId.replace(
              'led',
              ''
            )
          ) - 1;

        const isNowOn =
          ledStatus[
            ledIndex
          ] === '1';

        setLedStates(
          (prev) => ({
            ...prev,
            [ledId]:
              isNowOn,
          })
        );

        showToast(
          `Đã ${
            isNowOn
              ? 'bật'
              : 'tắt'
          } Đèn LED ${ledNumber} thành công!`,
          'success'
        );
      } else {
        showToast(
          `Không thể điều khiển Đèn LED ${ledNumber}. Vui lòng thử lại!`,
          'error'
        );
      }
    } catch (error) {
      console.error(
        `Lỗi điều khiển ${ledId}:`,
        error
      );

      showToast(
        `Lỗi kết nối khi gửi lệnh tới Đèn LED ${ledNumber}!`,
        'error'
      );
    } finally {
      setLoadingLed(
        (prev) => ({
          ...prev,
          [ledId]:
            false,
        })
      );
    }
  };

  const generateSvgPath = (
    key: keyof SensorData
  ): string => {
    if (
      history.length === 0
    ) {
      return '';
    }

    const width = CHART_WIDTH;
    const height = CHART_HEIGHT;
    const padding = CHART_PADDING;

    const usableHeight =
      height -
      padding * 2;

    const stepX =
      width /
      (MAX_HISTORY_LENGTH - 1);

    const {
      min,
      max: effectiveMax,
    } =
      SENSOR_CONFIG[key];

    const points = history
      .map(
        (
          point,
          index
        ) => {
          const reading =
            point[key];

          if (reading === null) {
            return null;
          }

          const x =
            width -
            (
              history.length -
              1 -
              index
            ) *
              stepX;

          const value =
            Math.max(
              min,
              Math.min(
                effectiveMax,
                reading
              )
            );

          const normalized =
            (
              value -
              min
            ) /
            (
              effectiveMax -
              min
            );

          const y =
            height -
            padding -
            normalized *
              usableHeight;

          return {
            index,
            x,
            y,
          };
        }
      )
      .filter(
        (
          point
        ): point is {
          index: number;
          x: number;
          y: number;
        } => point !== null
      );

    return points
      .map(
        (
          point,
          index
        ) => {
          const previous =
            points[index - 1];

          const command =
            !previous ||
            point.index -
              previous.index >
              1
              ? 'M'
              : 'L';

          return `${command} ${point.x.toFixed(
            1
          )} ${point.y.toFixed(
            1
          )}`;
        }
      )
      .join(' ');
  };

  const getChartXPercent = (
    index: number
  ): number => {
    const width = CHART_WIDTH;

    const stepX =
      width /
      (MAX_HISTORY_LENGTH - 1);

    const x =
      width -
      (history.length - 1 - index) *
        stepX;

    return (x / width) * 100;
  };

  const handleChartMouseMove = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (history.length === 0) {
      setHoverIndex(null);
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    const mouseX =
      ((event.clientX - rect.left) /
        rect.width) *
      CHART_WIDTH;

    const stepX =
      CHART_WIDTH /
      (MAX_HISTORY_LENGTH - 1);

    let nearestIndex = 0;
    let nearestDistance = Infinity;

    history.forEach(
      (_, index) => {
        const x =
          CHART_WIDTH -
          (history.length - 1 - index) *
            stepX;

        const distance = Math.abs(
          x - mouseX
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      }
    );

    setHoverIndex(nearestIndex);
  };

  const hoveredPoint =
    hoverIndex !== null
      ? history[hoverIndex] ?? null
      : null;

  const hoverXPercent =
    hoverIndex !== null
      ? getChartXPercent(hoverIndex)
      : 0;

  const hasChartData =
    history.some(
      (point) =>
        point.temperature !== null ||
        point.humidity !== null ||
        point.light !== null
    );

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

          .led-switch {
            transition:
              background 0.3s ease,
              border-color 0.3s ease,
              box-shadow 0.2s ease,
              transform 0.15s ease;
          }

          .led-switch:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow:
              0 0 0 3px rgba(2, 132, 199, 0.2);
          }

          .led-switch:active:not(:disabled) {
            transform: translateY(0);
          }

          .led-switch:focus-visible {
            outline: 2px solid #0284c7;
            outline-offset: 2px;
          }
        `}
      </style>

      {!isConnected && (
        <div
          style={
            styles.disconnectBanner
          }
        >
          <span
            style={
              styles.disconnectDot
            }
          />

          <span>
            Mất kết nối với thiết bị
            cảm biến
          </span>
        </div>
      )}

      {toast && (
        <div
          style={{
            ...styles.toast,
            backgroundColor:
              toast.type ===
              'success'
                ? '#16a34a'
                : '#dc2626',
          }}
        >
          <span
            style={
              styles.toastIcon
            }
          >
            {toast.type ===
            'success'
              ? '✓'
              : '✕'}
          </span>

          <span>
            {toast.message}
          </span>
        </div>
      )}

      <div
        style={
          styles.cardsRow
        }
      >
        <div
          style={{
            ...styles.card,
            background: getValueGradient(
              sensorData.temperature ??
                SENSOR_CONFIG.temperature.min,
              SENSOR_CONFIG.temperature.min,
              SENSOR_CONFIG.temperature.max,
              '#fef3c7',
              '#fbbf24',
              '#ef4444'
            ),
            opacity:
              isConnected
                ? 1
                : 0.6,
          }}
        >
          <div
            style={
              styles.cardLabel
            }
          >
            NHIỆT ĐỘ
          </div>

          <div
            style={
              styles.cardValGroup
            }
          >
            <span
              style={
                styles.cardVal
              }
            >
              {
                sensorData.temperature ??
                  '--'
              }
            </span>

            <span
              style={
                styles.cardUnit
              }
            >
              °C
            </span>
          </div>
        </div>

        <div
          style={{
            ...styles.card,
            background: getValueGradient(
              sensorData.humidity ??
                SENSOR_CONFIG.humidity.min,
              SENSOR_CONFIG.humidity.min,
              SENSOR_CONFIG.humidity.max,
              '#eff6ff',
              '#93c5fd',
              '#2563eb'
            ),
            opacity:
              isConnected
                ? 1
                : 0.6,
          }}
        >
          <div
            style={
              styles.cardLabel
            }
          >
            ĐỘ ẨM
          </div>

          <div
            style={
              styles.cardValGroup
            }
          >
            <span
              style={
                styles.cardVal
              }
            >
              {
                sensorData.humidity ??
                  '--'
              }
            </span>

            <span
              style={
                styles.cardUnit
              }
            >
              %
            </span>
          </div>
        </div>

        <div
          style={{
            ...styles.card,
            background: getValueGradient(
              sensorData.light ??
                SENSOR_CONFIG.light.min,
              SENSOR_CONFIG.light.min,
              SENSOR_CONFIG.light.max,
              '#f0fdf4',
              '#86efac',
              '#16a34a'
            ),
            opacity:
              isConnected
                ? 1
                : 0.6,
          }}
        >
          <div
            style={
              styles.cardLabel
            }
          >
            ÁNH SÁNG
          </div>

          <div
            style={
              styles.cardValGroup
            }
          >
            <span
              style={
                styles.cardVal
              }
            >
              {
                sensorData.light ??
                  '--'
              }
            </span>

            <span
              style={
                styles.cardUnit
              }
            >
              Lux
            </span>
          </div>
        </div>
      </div>

      <div
        style={
          styles.gridContainer
        }
      >
        <div
          style={
            styles.chartCard
          }
        >
          <div
            style={
              styles.chartHeader
            }
          >
            <h3
              style={
                styles.cardTitle
              }
            >
              Giám sát thời gian thực
            </h3>

            <div
              style={
                styles.legendGroup
              }
            >
              <div
                style={
                  styles.legendItem
                }
              >
                <span
                  style={{
                    ...styles.legendDot,
                    background:
                      SENSOR_CONFIG
                        .temperature
                        .color,
                  }}
                />

                <span
                  style={
                    styles.legendText
                  }
                >
                  Nhiệt độ (°C)
                </span>
              </div>

              <div
                style={
                  styles.legendItem
                }
              >
                <span
                  style={{
                    ...styles.legendDot,
                    background:
                      SENSOR_CONFIG
                        .humidity
                        .color,
                  }}
                />

                <span
                  style={
                    styles.legendText
                  }
                >
                  Độ ẩm (%)
                </span>
              </div>

              <div
                style={
                  styles.legendItem
                }
              >
                <span
                  style={{
                    ...styles.legendDot,
                    background:
                      SENSOR_CONFIG
                        .light
                        .color,
                  }}
                />

                <span
                  style={
                    styles.legendText
                  }
                >
                  Ánh sáng (Lux)
                </span>
              </div>
            </div>
          </div>

          <div
            style={
              styles.chartBody
            }
          >
            <div
              style={styles.chartPlotRow}
            >
              <div
                style={styles.yAxis}
              >
                {Y_AXIS_TICKS.map(
                  (tick) => (
                    <div
                      key={tick}
                      style={{
                        ...styles.yAxisTick,
                        top: `${getPlotTopPercent(
                          tick
                        )}%`,
                        transform:
                          'translateY(-50%)',
                      }}
                    >
                      <span
                        style={{
                          ...styles.yAxisValue,
                          color:
                            SENSOR_CONFIG
                              .temperature
                              .color,
                        }}
                      >
                        {getAxisValue(
                          'temperature',
                          tick
                        )}
                      </span>

                      <span
                        style={{
                          ...styles.yAxisValue,
                          color:
                            SENSOR_CONFIG
                              .humidity
                              .color,
                        }}
                      >
                        {getAxisValue(
                          'humidity',
                          tick
                        )}
                      </span>

                      <span
                        style={{
                          ...styles.yAxisValue,
                          color:
                            SENSOR_CONFIG
                              .light
                              .color,
                        }}
                      >
                        {getAxisValue(
                          'light',
                          tick
                        )}
                      </span>
                    </div>
                  )
                )}
              </div>

              <div
                style={
                  styles.chartGridLines
                }
              onMouseMove={
                handleChartMouseMove
              }
              onMouseLeave={() =>
                setHoverIndex(null)
              }
            >
              {Y_AXIS_TICKS.map(
                (tick) => (
                  <div
                    key={tick}
                    style={{
                      ...styles.gridLine,
                      top: `${getPlotTopPercent(
                        tick
                      )}%`,
                    }}
                  />
                )
              )}

              <svg
                viewBox="0 0 500 200"
                preserveAspectRatio="none"
                style={
                  styles.chartSvg
                }
              >
                <path
                  d={generateSvgPath(
                    'temperature'
                  )}
                  fill="none"
                  stroke={
                    SENSOR_CONFIG
                      .temperature
                      .color
                  }
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={
                    isConnected
                      ? 1
                      : 0.4
                  }
                />

                <path
                  d={generateSvgPath(
                    'humidity'
                  )}
                  fill="none"
                  stroke={
                    SENSOR_CONFIG
                      .humidity
                      .color
                  }
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={
                    isConnected
                      ? 1
                      : 0.4
                  }
                />

                <path
                  d={generateSvgPath(
                    'light'
                  )}
                  fill="none"
                  stroke={
                    SENSOR_CONFIG
                      .light
                      .color
                  }
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={
                    isConnected
                      ? 1
                      : 0.4
                  }
                />
              </svg>

              {!hasChartData && (
                <div
                  style={
                    styles.chartEmpty
                  }
                >
                  Đang chờ dữ liệu...
                </div>
              )}

              {hoveredPoint && (
                <>
                  <div
                    style={{
                      ...styles.hoverGuide,
                      left: `${hoverXPercent}%`,
                    }}
                  />

                  <div
                    style={{
                      ...styles.chartTooltip,
                      left: `${hoverXPercent}%`,
                      transform:
                        hoverXPercent > 50
                          ? 'translateX(calc(-100% - 10px))'
                          : 'translateX(10px)',
                    }}
                  >
                    <div style={styles.tooltipRow}>
                      <span
                        style={{
                          ...styles.legendDot,
                          background:
                            SENSOR_CONFIG
                              .temperature
                              .color,
                        }}
                      />

                      <span style={styles.tooltipLabel}>
                        Nhiệt độ
                      </span>

                      <span style={styles.tooltipValue}>
                        {hoveredPoint.temperature ??
                          '--'}{' '}
                        °C
                      </span>
                    </div>

                    <div style={styles.tooltipRow}>
                      <span
                        style={{
                          ...styles.legendDot,
                          background:
                            SENSOR_CONFIG
                              .humidity
                              .color,
                        }}
                      />

                      <span style={styles.tooltipLabel}>
                        Độ ẩm
                      </span>

                      <span style={styles.tooltipValue}>
                        {hoveredPoint.humidity ??
                          '--'}{' '}
                        %
                      </span>
                    </div>

                    <div style={styles.tooltipRow}>
                      <span
                        style={{
                          ...styles.legendDot,
                          background:
                            SENSOR_CONFIG
                              .light
                              .color,
                        }}
                      />

                      <span style={styles.tooltipLabel}>
                        Ánh sáng
                      </span>

                      <span style={styles.tooltipValue}>
                        {hoveredPoint.light ??
                          '--'}{' '}
                        Lux
                      </span>
                    </div>
                  </div>
                </>
              )}
              </div>
            </div>
          </div>
        </div>

        <div
          style={
            styles.controlCard
          }
        >
          <h3
            style={
              styles.cardTitle
            }
          >
            Trung tâm điều khiển
          </h3>

          <div
            style={
              styles.ledList
            }
          >
            {(
              [
                'led1',
                'led2',
                'led3',
                'led4',
              ] as LEDId[]
            ).map(
              (
                id,
                index
              ) => {
                const isOn =
                  ledStates[id];

                const isLoading =
                  loadingLed[id];

                return (
                  <div
                    key={id}
                    style={
                      styles.ledRow
                    }
                  >
                    <div
                      style={
                        styles.ledInfo
                      }
                    >
                      <div
                        style={
                          styles.ledIconBox
                        }
                      >
                        <div
                          style={{
                            ...styles.ledIndicator,color:"gray",

                            background:
                              isOn
                                ? '#4ade80'
                                : '#64748b',

                            boxShadow:
                              isOn
                                ? '0 0 8px #4ade80'
                                : 'none',
                          }}
                        />
                      </div>

                      <span
                        style={
                          styles.ledName
                        }
                      >
                        Đèn LED{' '}
                        {index + 1}
                      </span>

                      <span
                        style={{
                          ...styles.statusTag,

                          color:
                            isOn
                              ? '#4ade80'
                              : '#a0a7b8',

                          background:
                            isOn
                              ? 'rgba(74, 222, 128, 0.15)'
                              : 'rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        {isOn
                          ? 'BẬT'
                          : 'TẮT'}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="led-switch"
                      aria-label={`${
                        isOn
                          ? 'Tắt'
                          : 'Bật'
                      } Đèn LED ${
                        index + 1
                      }`}
                      aria-pressed={
                        isOn
                      }
                      onClick={() =>
                        toggleLED(
                          id
                        )
                      }
                      disabled={
                        isLoading
                      }
                      style={{
                        ...styles.switchBtn,

                        background:
                          isOn
                            ? '#0284c7'
                            : '#cbd5e1',

                        border: isOn
                          ? '1px solid #0369a1'
                          : '1px solid #94a3b8',

                        boxShadow:
                          isOn
                            ? '0 0 0 3px rgba(2, 132, 199, 0.18)'
                            : 'inset 0 1px 2px rgba(15, 23, 42, 0.12)',

                        opacity:
                          isLoading
                            ? 0.7
                            : 1,

                        cursor:
                          isLoading
                            ? 'not-allowed'
                            : 'pointer',
                      }}
                    >
                      <div
                        style={{
                          ...styles.switchThumb,

                          transform:
                            isOn
                              ? 'translateX(22px)'
                              : 'translateX(0px)',
                        }}
                      >
                        {isLoading && (
                          <div
                            style={
                              styles.spinner
                            }
                          />
                        )}
                      </div>
                    </button>
                  </div>
                );
              }
            )}
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
    color: '#000000',
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
      'clamp(22px, 2.5vw, 30px)',
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
    color: "#000000",
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
    flex: '1 1 auto',
    overflow: 'hidden',
  },

  chartPlotRow: {
    display: 'flex',
    alignItems: 'stretch',
    flex: '1 1 auto',
    minHeight: 0,
    minWidth: 0,
  },

  yAxis: {
    position: 'relative',
    width:
      'clamp(84px, 11vw, 110px)',
    height:
      'clamp(180px, 30vh, 500px)',
    flexShrink: 0,
    marginRight: '6px',
    minWidth: 0,
  },

  yAxisTick: {
    position: 'absolute',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    gap: '4px',
  },

  yAxisValue: {
    flex: 1,
    fontSize:
      'clamp(8px, 0.65vw, 11px)',
    fontWeight: 600,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
    whiteSpace: 'nowrap',
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

  chartEmpty: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
    fontSize:
      'clamp(10px, 0.8vw, 13px)',
    fontWeight: 600,
    pointerEvents: 'none',
  },

  hoverGuide: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 0,
    borderLeft:
      '1px dashed #9ca3af',
    transform: 'translateX(-0.5px)',
    pointerEvents: 'none',
    zIndex: 1,
  },

  chartTooltip: {
    position: 'absolute',
    top: '10px',
    minWidth: '132px',
    padding: '8px 10px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow:
      '0 6px 16px rgba(15, 23, 42, 0.12)',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    pointerEvents: 'none',
    zIndex: 2,
  },

  tooltipRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize:
      'clamp(9px, 0.7vw, 12px)',
    whiteSpace: 'nowrap',
  },

  tooltipLabel: {
    color: '#6b7280',
  },

  tooltipValue: {
    marginLeft: 'auto',
    fontWeight: 700,
    color: '#111827',
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
    width: '48px',
    minWidth: '48px',
    height: '26px',
    borderRadius: '13px',
    border: 'none',
    padding: '3px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },

  switchThumb: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#ffffff',
    boxShadow:
      '0 1px 4px rgba(15, 23, 42, 0.35)',
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
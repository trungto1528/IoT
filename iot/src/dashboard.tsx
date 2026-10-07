import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axios from 'axios';

interface SensorData {
  temperature: number;
  humidity: number;
  light: number;
}

interface HistoryPoint extends SensorData {
  timestamp: string;
}

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
    color: '#fb923c',
  },

  humidity: {
    min: 0,
    max: 100,
    color: '#60a5fa',
  },

  light: {
    min: 0,
    max: 10000,
    color: '#4ade80',
  },
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
      temperature: 0,
      humidity: 0,
      light: 0,
    });

  const [history, setHistory] =
    useState<HistoryPoint[]>([]);

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
   * Hiển thị HH:mm:ss trên trục X.
   */
  const formatChartTime = (
    timestamp: string
  ): string => {
    if (!timestamp) {
      return '';
    }

    const value =
      timestamp.replace('T', ' ');

    if (value.includes(' ')) {
      return value.split(' ')[1]
        ?.substring(0, 8) ?? value;
    }

    return value.substring(0, 8);
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
              Number(record.value);
          }

          if (
            record.type === 'humid' ||
            record.type === 'HUMID'
          ) {
            existing.humidity =
              Number(record.value);
          }

          if (
            record.type === 'light' ||
            record.type === 'LIGHT'
          ) {
            existing.light =
              Number(record.value);
          }

          return;
        }

        const point: HistoryPoint = {
          temperature: 0,
          humidity: 0,
          light: 0,
          timestamp,
        };

        if (
          record.type === 'temp' ||
          record.type === 'TEMP'
        ) {
          point.temperature =
            Number(record.value);
        }

        if (
          record.type === 'humid' ||
          record.type === 'HUMID'
        ) {
          point.humidity =
            Number(record.value);
        }

        if (
          record.type === 'light' ||
          record.type === 'LIGHT'
        ) {
          point.light =
            Number(record.value);
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
                  merged.set(
                    point.timestamp,
                    point
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
                setSensorData({
                  temperature:
                    latest.temperature,
                  humidity:
                    latest.humidity,
                  light:
                    latest.light,
                });
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
                  temperature:
                    Number(
                      body.temp ??
                        body.temperature ??
                        0
                    ),

                  humidity:
                    Number(
                      body.humid ??
                        body.humidity ??
                        0
                    ),

                  light:
                    Number(
                      body.light ?? 0
                    ),
                };

                /*
                 * Ưu tiên timestamp do thiết bị gửi.
                 *
                 * Backend cũng sử dụng timestamp này
                 * để lưu cả 3 sensor.
                 */
                let timestamp: string;

                if (
                  body.timestamp
                ) {
                  timestamp =
                    new Date(
                      Number(
                        body.timestamp
                      ) * 1000
                    ).toISOString();
                } else {
                  timestamp =
                    new Date().toISOString();
                }

                setSensorData(
                  newData
                );

                setHistory(
                  (prevHistory) => {
                    const newPoint: HistoryPoint =
                      {
                        ...newData,
                        timestamp,
                      };

                    /*
                     * Nếu cùng timestamp thì cập nhật
                     * điểm đó thay vì tạo điểm trùng.
                     */
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

    const width = 500;
    const height = 200;
    const padding = 10;

    const usableHeight =
      height -
      padding * 2;

    const stepX =
      width /
      (MAX_HISTORY_LENGTH - 1);

    const {
      min,
      max: defaultConfigMax,
    } =
      SENSOR_CONFIG[key];

    let effectiveMax =
      defaultConfigMax;

    if (
      key === 'light'
    ) {
      const currentMaxLight =
        Math.max(
          ...history.map(
            (item) =>
              item.light
          ),
          0
        );

      effectiveMax =
        Math.max(
          defaultConfigMax,
          currentMaxLight
        );
    }

    return history
      .map(
        (
          point,
          index
        ) => {
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
                point[key]
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

          return `${
            index === 0
              ? 'M'
              : 'L'
          } ${x.toFixed(
            1
          )} ${y.toFixed(
            1
          )}`;
        }
      )
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
                ? '#10b981'
                : '#ef4444',
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
                sensorData.temperature
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
                sensorData.humidity
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
                sensorData.light
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
                  Nhiệt độ
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
                  Độ ẩm
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
                  Ánh sáng
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
              style={
                styles.chartGridLines
              }
            >
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
            </div>

            <div
              style={
                styles.chartXAxis
              }
            >
              {history.length ===
              0 ? (
                <span>
                  Đang chờ dữ liệu...
                </span>
              ) : (
                history.map(
                  (
                    item,
                    idx
                  ) => {
                    const showLabel =
                      idx ===
                        history.length -
                          1 ||
                      idx % 4 ===
                        0;

                    const currentPosPct =
                      100 -
                      (
                        (
                          history.length -
                          1 -
                          idx
                        ) /
                        (
                          MAX_HISTORY_LENGTH -
                          1
                        )
                      ) *
                        100;

                    return (
                      <span
                        key={
                          item.timestamp
                        }
                        style={{
                          position:
                            'absolute',

                          left: `${currentPosPct}%`,

                          transform:
                            'translateX(-50%)',

                          opacity:
                            showLabel
                              ? 1
                              : 0,

                          whiteSpace:
                            'nowrap',

                          transition:
                            'left 0.3s ease-in-out',
                        }}
                      >
                        {formatChartTime(
                          item.timestamp
                        )}
                      </span>
                    );
                  }
                )
              )}
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
                            ...styles.ledIndicator,

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
                            ? '#38bdf8'
                            : 'rgba(255, 255, 255, 0.1)',

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
                              ? 'translateX(20px)'
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
    background:
      'rgba(239, 68, 68, 0.2)',
    border:
      '1px solid #ef4444',
    borderRadius: '8px',
    padding:
      'clamp(8px, 1vw, 12px) clamp(10px, 1.2vw, 16px)',
    color: '#fca5a5',
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
    backgroundColor: '#ef4444',
    display: 'inline-block',
    animation:
      'pulse 1.5s infinite',
  },

  toast: {
    position: 'fixed',
    top: 'clamp(10px, 2vw, 20px)',
    left: '50%',
    transform:
      'translateX(-50%)',
    zIndex: 9999,
    maxWidth:
      'min(90vw, 600px)',
    padding:
      'clamp(8px, 1vw, 12px) clamp(12px, 2vw, 24px)',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize:
      'clamp(11px, 0.85vw, 14px)',
    fontWeight: 600,
    boxShadow:
      '0 4px 12px rgba(0,0,0,0.3)',
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
    background:
      'rgba(255, 255, 255, 0.03)',
    boxShadow:
      'inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
    backdropFilter:
      'blur(20px)',
    borderRadius: '12px',
    padding:
      'clamp(10px, 1.5vw, 24px)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    transition:
      'opacity 0.3s ease',
    minWidth: 0,
    boxSizing: 'border-box',
    overflow: 'hidden',
  },

  cardLabel: {
    fontSize:
      'clamp(9px, 0.75vw, 12px)',
    fontWeight: 700,
    color: '#a0a7b8',
    letterSpacing: '0.6px',
    textTransform:
      'uppercase',
    overflow: 'hidden',
    textOverflow:
      'ellipsis',
    whiteSpace:
      'nowrap',
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
    color: '#ffffff',
    overflow: 'hidden',
    textOverflow:
      'ellipsis',
    whiteSpace:
      'nowrap',
    minWidth: 0,
  },

  cardUnit: {
    fontSize:
      'clamp(12px, 1.4vw, 20px)',
    color: '#8c91a0',
    fontWeight: 300,
    whiteSpace:
      'nowrap',
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
    background:
      'rgba(255, 255, 255, 0.03)',
    boxShadow:
      'inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
    backdropFilter:
      'blur(20px)',
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
    justifyContent:
      'space-between',
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
    color: '#ffffff',
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
    color: '#a0a7b8',
    whiteSpace:
      'nowrap',
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
    borderLeft:
      '1px solid rgba(255, 255, 255, 0.08)',
    borderBottom:
      '1px solid rgba(255, 255, 255, 0.08)',
    minWidth: 0,
    overflow: 'hidden',
  },

  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '1px',
    background:
      'rgba(255, 255, 255, 0.03)',
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
    color: '#a0a7b8',
    overflow: 'hidden',
    minWidth: 0,
    flexShrink: 0,
  },

  controlCard: {
    background:
      'rgba(255, 255, 255, 0.03)',
    boxShadow:
      'inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
    backdropFilter:
      'blur(20px)',
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
    background:
      'rgba(255, 255, 255, 0.03)',
    boxShadow:
      'inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding:
      'clamp(8px, 1vw, 12px) clamp(8px, 1.2vw, 16px)',
    display: 'flex',
    justifyContent:
      'space-between',
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
    background:
      'rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'center',
    flexShrink: 0,
  },

  ledIndicator: {
    width: '10px',
    height: '10px',
    minWidth: '10px',
    borderRadius: '50%',
    transition:
      'all 0.3s ease',
  },

  ledName: {
    fontSize:
      'clamp(10px, 0.9vw, 14px)',
    fontWeight: 600,
    color: '#ffffff',
    overflow: 'hidden',
    textOverflow:
      'ellipsis',
    whiteSpace:
      'nowrap',
    minWidth: 0,
  },

  statusTag: {
    fontSize:
      'clamp(8px, 0.65vw, 10px)',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
    flexShrink: 0,
    whiteSpace:
      'nowrap',
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
    transition:
      'background 0.3s ease',
    flexShrink: 0,
  },

  switchThumb: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#ffffff',
    transition:
      'transform 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'center',
  },

  spinner: {
    width: '12px',
    height: '12px',
    border:
      '2px solid rgba(0, 0, 0, 0.1)',
    borderTop:
      '2px solid #0284c7',
    borderRadius: '50%',
    animation:
      'spin 0.8s linear infinite',
  },
};

export default Dashboard;
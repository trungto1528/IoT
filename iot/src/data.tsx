import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface SensorRecord {
  id: number;
  stt: string;
  type: 'temperature' | 'humidity' | 'light';
  typeName: string;
  rawValue: number;
  value: string;
  highlight?: boolean;
  timestamp: string;
}

interface SensorApiRecord {
  id: number;
  type: 'temp' | 'humid' | 'light';
  value: number;
  time: string;
}

interface SensorApiResponse {
  content: SensorApiRecord[];
  totalPages: number;
}

type SortField =
  | 'stt'
  | 'typeName'
  | 'rawValue'
  | 'timestamp';

type SortOrder = 'asc' | 'desc';

export function SensorData() {
  const navigate = useNavigate();

  const [selectedSensor, setSelectedSensor] =
    useState<string>('all');

  const [selectedTime, setSelectedTime] =
    useState<string>('');

  const [searchValue, setSearchValue] =
    useState<string>('');

  const [sensorData, setSensorData] =
    useState<SensorRecord[]>([]);

  const [currentPage, setCurrentPage] =
    useState(0);

  const [totalPages, setTotalPages] =
    useState(0);

  const PAGE_SIZE = 10;

  const [sortField, setSortField] =
    useState<SortField>('stt');

  const [sortOrder, setSortOrder] =
    useState<SortOrder>('asc');

  useEffect(() => {
    const isLoggedIn =
      localStorage.getItem('isLoggedIn');

    if (isLoggedIn !== 'true') {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          size: PAGE_SIZE.toString(),
        });

        if (selectedSensor !== 'all') {
          params.append(
            'type',
            selectedSensor
          );
        }

        if (searchValue.trim()) {
          const parsedValue =
            Number(searchValue.trim());

          if (!Number.isNaN(parsedValue)) {
            params.append(
              'value',
              parsedValue.toString()
            );
          }
        }


        if (isValidTimeFilter(selectedTime.trim())) {
          params.set(
            'time',
            selectedTime.trim()
          );
        }

        const response = await fetch(
          `http://localhost:8080/api/sensor-data?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error(
            'Unable to fetch sensor data'
          );
        }

        const data: SensorApiResponse =
          await response.json();

        const typeDetails = {
          temp: {
            type: 'temperature' as const,
            typeName: 'Nhiệt độ',
            unit: '°C',
          },

          humid: {
            type: 'humidity' as const,
            typeName: 'Độ ẩm',
            unit: '%',
          },

          light: {
            type: 'light' as const,
            typeName: 'Ánh sáng',
            unit: 'Lux',
          },
        };

        setTotalPages(data.totalPages);

        setSensorData(
          data.content.map((item, index) => {
            const detail =
              typeDetails[item.type] || {
                type: 'temperature' as const,
                typeName: 'Nhiệt độ',
                unit: '°C',
              };

            return {
              id: item.id,

              stt: String(
                currentPage * PAGE_SIZE +
                index +
                1
              ).padStart(2, '0'),

              type: detail.type,
              typeName: detail.typeName,
              rawValue: item.value,

              value: `${item.value} ${detail.unit}`,

              timestamp: item.time.replace(
                'T',
                ' '
              ),
            };
          })
        );
      } catch (error) {
        console.error(
          'Failed to fetch sensor data:',
          error
        );

        setSensorData([]);
        setTotalPages(0);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchSensorData();
    }, 300);

    return () =>
      clearTimeout(timeoutId);
  }, [
    currentPage,
    selectedSensor,
    selectedTime,
    searchValue,
  ]);

  const handleSort = (
    field: SortField
  ) => {
    if (sortField === field) {
      setSortOrder((prev) =>
        prev === 'asc'
          ? 'desc'
          : 'asc'
      );
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };
  const isValidTimeFilter = (value: string) => {
    const time = value.trim();

    if (!time) {
      return false;
    }

    return (
      /^\d{4}$/.test(time) ||
      /^\d{4}-\d{2}$/.test(time) ||
      /^\d{4}-\d{2}-\d{2}$/.test(time) ||
      /^\d{4}-\d{2}-\d{2} \d{2}$/.test(time) ||
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(time) ||
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(time)
    );
  };
  const processedData = useMemo(() => {
    const data = [...sensorData];

    return data.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (valA < valB) {
        return sortOrder === 'asc'
          ? -1
          : 1;
      }

      if (valA > valB) {
        return sortOrder === 'asc'
          ? 1
          : -1;
      }

      return 0;
    });
  }, [
    sensorData,
    sortField,
    sortOrder,
  ]);

  const renderTypeBadge = (
    type: SensorRecord['type'],
    typeName: string
  ) => {
    const typeColors = {
      temperature: '#fb923c',
      humidity: '#60a5fa',
      light: '#4ade80',
    };

    const color =
      typeColors[type] || '#dae2fd';

    return (
      <span
        style={{
          color,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: 500,
          minWidth: 0,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            minWidth: '6px',
            borderRadius: '50%',
            background: color,
          }}
        />

        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {typeName}
        </span>
      </span>
    );
  };

  const renderSortableHeader = (
    field: SortField,
    label: string,
    alignRight = false
  ) => {
    const isActive =
      sortField === field;

    return (
      <th
        style={{
          ...styles.th,
          textAlign: alignRight
            ? 'right'
            : 'left',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() =>
          handleSort(field)
        }
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'clamp(3px, 0.4vw, 6px)',
            flexDirection: alignRight
              ? 'row-reverse'
              : 'row',
            maxWidth: '100%',
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>

          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke={
              isActive
                ? '#3b82f6'
                : '#8c91a0'
            }
            strokeWidth="2.5"
            style={{
              transform:
                isActive &&
                  sortOrder === 'asc'
                  ? 'rotate(180deg)'
                  : 'rotate(0deg)',

              transition:
                'transform 0.2s ease, stroke 0.2s ease',

              flexShrink: 0,
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </th>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h2 style={styles.pageTitle}>
          Dữ liệu cảm biến
        </h2>

        <div style={styles.filterGroup}>
          <div style={styles.selectWrapper}>
            <select
              value={selectedSensor}
              onChange={(e) => {
                setSelectedSensor(
                  e.target.value
                );
                setCurrentPage(0);
              }}
              style={styles.selectInput}
            >
              <option value="all">
                Tất cả cảm biến
              </option>

              <option value="temperature">
                Nhiệt độ
              </option>

              <option value="humidity">
                Độ ẩm
              </option>

              <option value="light">
                Ánh sáng
              </option>
            </select>

            <input
              type="number"
              step="any"
              placeholder="Giá trị cảm biến"
              value={searchValue}
              onChange={(e) => {
                setSearchValue(
                  e.target.value
                );
                setCurrentPage(0);
              }}
              style={styles.searchInput}
            />

            <span style={styles.selectIcon}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8c91a0"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </div>

          <div style={styles.selectWrapper}>
            <input
              type="text"
              placeholder="YYYY-MM-DD HH:mm:ss"
              value={selectedTime}
              onChange={(e) => {
                setSelectedTime(
                  e.target.value
                );
                setCurrentPage(0);
              }}
              style={styles.searchInput}
            />

            {selectedTime && (
              <button
                onClick={() => {
                  setSelectedTime('');
                  setCurrentPage(0);
                }}
                style={styles.clearBtn}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={styles.tableCard}>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                {renderSortableHeader(
                  'stt',
                  'STT'
                )}

                {renderSortableHeader(
                  'typeName',
                  'LOẠI CẢM BIẾN'
                )}

                {renderSortableHeader(
                  'rawValue',
                  'GIÁ TRỊ'
                )}

                {renderSortableHeader(
                  'timestamp',
                  'THỜI GIAN GHI NHẬN',
                  true
                )}
              </tr>
            </thead>

            <tbody>
              {processedData.length > 0 ? (
                processedData.map((row) => (
                  <tr
                    key={row.id}
                    style={styles.tr}
                  >
                    <td style={styles.tdId}>
                      {row.stt}
                    </td>

                    <td style={styles.td}>
                      {renderTypeBadge(
                        row.type,
                        row.typeName
                      )}
                    </td>

                    <td style={styles.td}>
                      {row.value}
                    </td>

                    <td style={styles.tdTime}>
                      {row.timestamp}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    style={styles.emptyTd}
                  >
                    Không tìm thấy dữ liệu phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.pagination}>
          <button
            style={{
              ...styles.pageArrow,
              opacity:
                currentPage === 0
                  ? 0.4
                  : 1,
            }}
            disabled={currentPage === 0}
            onClick={() =>
              setCurrentPage(
                (page) => page - 1
              )
            }
          >
            &lt;
          </button>

          <span style={styles.pageActiveNum}>
            {totalPages
              ? currentPage + 1
              : 0}{' '}
            / {totalPages}
          </span>

          <button
            style={{
              ...styles.pageArrow,
              opacity:
                currentPage >=
                  totalPages - 1
                  ? 0.4
                  : 1,
            }}
            disabled={
              currentPage >=
              totalPages - 1
            }
            onClick={() =>
              setCurrentPage(
                (page) => page + 1
              )
            }
          >
            &gt;
          </button>
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
    boxSizing: 'border-box',
  },

  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 'clamp(10px, 1.5vw, 20px)',
    flexWrap: 'wrap',
    minWidth: 0,
    flexShrink: 0,
  },

  pageTitle: {
    margin: 0,
    fontSize: 'clamp(18px, 2vw, 28px)',
    fontWeight: 700,
    color: '#06e961',
    minWidth: 0,
  },

  filterGroup: {
    display: 'flex',
    gap: 'clamp(8px, 1vw, 12px)',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    minWidth: 0,
    maxWidth: '100%',
  },

  selectWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
    maxWidth: '100%',
  },

  selectInput: {
    height: 'clamp(34px, 3vw, 40px)',
    padding:
      '0 clamp(28px, 2.5vw, 36px) 0 clamp(10px, 1.2vw, 16px)',
    background:
      'rgba(255, 255, 255, 0.05)',
    border:
      '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    color: '#dae2fd',
    fontSize:
      'clamp(11px, 0.9vw, 14px)',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    minWidth: 'clamp(130px, 14vw, 160px)',
    maxWidth: '100%',
    boxSizing: 'border-box',
  },

  searchInput: {
    height: 'clamp(34px, 3vw, 40px)',
    padding:
      '0 clamp(28px, 2.5vw, 32px) 0 clamp(10px, 1.2vw, 16px)',
    background:
      'rgba(255, 255, 255, 0.05)',
    border:
      '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize:
      'clamp(11px, 0.9vw, 14px)',
    outline: 'none',
    minWidth: 'clamp(150px, 18vw, 220px)',
    maxWidth: '100%',
    boxSizing: 'border-box',
  },

  clearBtn: {
    position: 'absolute',
    right: '10px',
    background: 'transparent',
    border: 'none',
    color: '#8c91a0',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '4px',
  },

  selectIcon: {
    position: 'absolute',
    right: '12px',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
  },

  tableCard: {
    background:
      'rgba(255, 255, 255, 0.03)',
    boxShadow:
      'inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(20px)',
    borderRadius: '12px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
    flex: '1 1 auto',
    boxSizing: 'border-box',
  },

  tableWrapper: {
    width: '100%',
    minWidth: 0,
    overflow: 'hidden',
    flex: '1 1 auto',
  },

  table: {
    width: '100%',
    minWidth: 0,
    borderCollapse: 'collapse',
    textAlign: 'left',
    tableLayout: 'fixed',
  },

  th: {
    padding:
      'clamp(8px, 1vw, 18px) clamp(8px, 1.5vw, 24px)',
    fontSize:
      'clamp(9px, 0.75vw, 12px)',
    fontWeight: 700,
    color: '#8c91a0',
    letterSpacing: '0.5px',
    borderBottom:
      '1px solid rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
  },

  tr: {
    borderBottom:
      '1px solid rgba(255, 255, 255, 0.03)',
  },

  tdId: {
    padding:
      'clamp(8px, 1vw, 18px) clamp(8px, 1.5vw, 24px)',
    fontSize:
      'clamp(10px, 0.85vw, 14px)',
    color: '#dae2fd',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
  },

  td: {
    padding:
      'clamp(8px, 1vw, 18px) clamp(8px, 1.5vw, 24px)',
    fontSize:
      'clamp(10px, 0.85vw, 14px)',
    color: '#dae2fd',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
  },

  tdTime: {
    padding:
      'clamp(8px, 1vw, 18px) clamp(8px, 1.5vw, 24px)',
    fontSize:
      'clamp(9px, 0.8vw, 14px)',
    color: '#8c91a0',
    textAlign: 'right',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
  },

  emptyTd: {
    padding:
      'clamp(20px, 2.5vw, 32px) clamp(12px, 1.5vw, 24px)',
    textAlign: 'center',
    color: '#8c91a0',
    fontSize:
      'clamp(11px, 0.9vw, 14px)',
  },

  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 'clamp(6px, 1vw, 12px)',
    padding:
      'clamp(8px, 1vw, 16px) clamp(10px, 1.5vw, 24px)',
    borderTop:
      '1px solid rgba(255, 255, 255, 0.05)',
    flexShrink: 0,
    minHeight: 'clamp(42px, 4vw, 56px)',
    boxSizing: 'border-box',
  },

  pageArrow: {
    background: 'transparent',
    border: 'none',
    color: '#8c91a0',
    fontSize:
      'clamp(11px, 0.9vw, 14px)',
    cursor: 'pointer',
    padding: '4px 8px',
  },

  pageActiveNum: {
    fontSize:
      'clamp(11px, 0.9vw, 14px)',
    fontWeight: 600,
    color: '#ffffff',
    whiteSpace: 'nowrap',
  },
};

export default SensorData;
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SensorRecord {
  id: number;
  stt: string;
  type: 'temperature' | 'humidity' | 'light' | 'gas' | 'smoke' | 'motion';
  typeName: string;
  rawValue: number;
  value: string;
  timestamp: string;
}

type SortField =
  | 'stt'
  | 'typeName'
  | 'rawValue'
  | 'timestamp';

type SortOrder = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface SensorApiRecord {
  id: number;
  type: 'temp' | 'humid' | 'light' | 'gas' | 'smoke' | 'motion';
  value: number;
  time: string;
}

interface SensorApiResponse {
  content: SensorApiRecord[];
  totalPages: number;
  totalElements: number;
  number: number;
}

const SENSOR_TYPE_DETAILS = {
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
  gas: {
    type: 'gas' as const,
    typeName: 'Khí gas',
    unit: '%',
  },
  smoke: {
    type: 'smoke' as const,
    typeName: 'Khói',
    unit: '%',
  },
  motion: {
    type: 'motion' as const,
    typeName: 'Chuyển động',
    unit: '%',
  },
};

const SENSOR_TYPES = [
  'temperature',
  'humidity',
  'light',
  'gas',
  'smoke',
  'motion',
] as const;

const SENSOR_TYPE_KEYWORDS: Record<
  (typeof SENSOR_TYPES)[number],
  string[]
> = {
  temperature: [
    'nhiệt độ',
    'nhiệt',
    'nhiet do',
    'nhiet',
    'temperature',
    'temp',
  ],
  humidity: [
    'độ ẩm',
    'do am',
    'humidity',
    'humid',
  ],
  light: [
    'ánh sáng',
    'anh sang',
    'light',
  ],
  gas: [
    'khí gas',
    'khigas',
    'gas',
  ],
  smoke: [
    'khói',
    'khoi',
    'smoke',
  ],
  motion: [
    'chuyển động',
    'chuyen dong',
    'motion',
  ],
};

const matchSensorType = (query: string) => {
  const normalized = query
    .toLowerCase()
    .normalize('NFC')
    .trim();

  return SENSOR_TYPES.find((type) =>
    SENSOR_TYPE_KEYWORDS[type].some(
      (keyword) => normalized.includes(keyword)
    )
  );
};

const SORT_PARAMS: Record<SortField, string> = {
  stt: 'id',
  typeName: 'sensor.type',
  rawValue: 'value',
  timestamp: 'time',
};

export function SensorData() {
  const navigate = useNavigate();

  const [selectedSensor, setSelectedSensor] =
    useState<string>('all');

  const [searchValue, setSearchValue] =
    useState<string>('');

  const [sensorData, setSensorData] =
    useState<SensorRecord[]>([]);

  const [currentPage, setCurrentPage] =
    useState(0);

  const [jumpPage, setJumpPage] =
    useState('');

  const [totalPages, setTotalPages] =
    useState(0);

  const [totalElements, setTotalElements] =
    useState(0);

  const [pageSize, setPageSize] =
    useState(10);

  const [sortField, setSortField] =
    useState<SortField>('stt');

  const [sortOrder, setSortOrder] =
    useState<SortOrder>('desc');

  const [loading, setLoading] =
    useState(false);

  const [errorMsg, setErrorMsg] =
    useState('');

  const [copiedId, setCopiedId] =
    useState<number | null>(null);

  const copyTimestamp = async (
    id: number,
    timestamp: string
  ) => {
    try {
      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(
          timestamp
        );
      } else {
        const textarea =
          document.createElement(
            'textarea'
          );

        textarea.value = timestamp;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';

        document.body.appendChild(
          textarea
        );

        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(
          textarea
        );
      }

      setCopiedId(id);

      setTimeout(() => {
        setCopiedId((current) =>
          current === id ? null : current
        );
      }, 1500);
    } catch (error) {
      console.error(
        'Không thể sao chép thời gian:',
        error
      );
    }
  };

  useEffect(() => {
    const isLoggedIn =
      localStorage.getItem('isLoggedIn');

    if (isLoggedIn !== 'true') {
      navigate('/');
    }
  }, [navigate]);

  const isSensorSearch =
    SENSOR_TYPES.includes(
      selectedSensor as (typeof SENSOR_TYPES)[number]
    );

  const isAllSearch =
    selectedSensor === 'all';

  const isTimeSearch =
    selectedSensor === 'time';

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

  useEffect(() => {
    const controller = new AbortController();

    const timeoutId = setTimeout(async () => {
      const query = searchValue.trim();

      if (isTimeSearch && query && !isValidTimeFilter(query)) {
        setSensorData([]);
        setTotalPages(0);
        setTotalElements(0);
        setErrorMsg(
          'Định dạng thời gian: YYYY, YYYY-MM, YYYY-MM-DD, YYYY-MM-DD HH:mm:ss'
        );
        return;
      }

      try {
        setLoading(true);
        setErrorMsg('');

        const params = new URLSearchParams({
          page: currentPage.toString(),
          size: pageSize.toString(),
          sort: `${SORT_PARAMS[sortField]},${sortOrder}`,
        });

        if (isSensorSearch && query) {
          const numericValue = Number(query);

          if (Number.isFinite(numericValue)) {
            params.set('type', selectedSensor);
            params.set('value', numericValue.toString());
          }
        }

        if (isAllSearch && query) {
          const numericValue = Number(query);

          if (isValidTimeFilter(query)) {
            params.set('time', query);
          } else if (Number.isFinite(numericValue)) {
            params.set(
              'value',
              numericValue.toString()
            );
          } else {
            const matchedType =
              matchSensorType(query);

            if (!matchedType) {
              setSensorData([]);
              setTotalPages(0);
              setTotalElements(0);
              setErrorMsg(
                'Nhập giá trị số, thời gian hoặc loại cảm biến (Nhiệt độ, Độ ẩm, Ánh sáng, Khí gas, Khói, Chuyển động).'
              );
              return;
            }

            params.set('type', matchedType);
          }
        }

        if (isTimeSearch && query) {
          params.set('time', query);
        }

        const response = await fetch(
          `http://localhost:8080/api/sensor-data?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error('Unable to fetch sensor data');
        }

        const data: SensorApiResponse = await response.json();

        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);

        setSensorData(
          data.content.map((item, index) => {
            const detail =
              SENSOR_TYPE_DETAILS[item.type] ||
              SENSOR_TYPE_DETAILS.temp;

            return {
              id: item.id,
              stt: String(
                currentPage * pageSize + index + 1
              ).padStart(2, '0'),
              type: detail.type,
              typeName: detail.typeName,
              rawValue: item.value,
              value: `${item.value} ${detail.unit}`,
              timestamp: item.time.replace('T', ' '),
            };
          })
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === 'AbortError'
        ) {
          return;
        }

        console.error('Failed to fetch sensor data:', error);
        setSensorData([]);
        setTotalPages(0);
        setTotalElements(0);
        setErrorMsg('Không thể tải dữ liệu cảm biến.');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    currentPage,
    pageSize,
    selectedSensor,
    searchValue,
    sortField,
    sortOrder,
    isSensorSearch,
    isTimeSearch,
  ]);

  const processedData = sensorData;


  useEffect(() => {
    if (totalPages === 0) {
      if (currentPage !== 0) {
        setCurrentPage(0);
      }

      return;
    }

    if (currentPage >= totalPages) {
      setCurrentPage(totalPages - 1);
    }
  }, [currentPage, totalPages]);
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

    setCurrentPage(0);
  };

  const handlePageSizeChange = (
    value: number
  ) => {
    setPageSize(value);
    setCurrentPage(0);
  };

  const handleJumpPage = (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!totalPages || !jumpPage.trim()) {
      return;
    }

    const target = Math.trunc(Number(jumpPage));

    if (Number.isNaN(target)) {
      setJumpPage('');
      return;
    }

    const page = Math.min(
      Math.max(target, 1),
      totalPages
    );

    setCurrentPage(page - 1);
    setJumpPage('');
  };

  const getVisiblePages = () => {
    if (totalPages <= 1) {
      return [0];
    }

    const pages = new Set<number>();

    pages.add(0);

    for (
      let page = currentPage - 2;
      page <= currentPage + 2;
      page++
    ) {
      if (
        page >= 0 &&
        page < totalPages
      ) {
        pages.add(page);
      }
    }

    pages.add(totalPages - 1);

    return Array.from(pages).sort(
      (a, b) => a - b
    );
  };

  const visiblePages = getVisiblePages();

  const renderPaginationItems = () => {
    const items: React.ReactNode[] = [];

    for (
      let index = 0;
      index < visiblePages.length;
      index++
    ) {
      const page = visiblePages[index];
      const previousPage =
        visiblePages[index - 1];

      if (
        index > 0 &&
        page - previousPage > 1
      ) {
        items.push(
          <span
            key={`ellipsis-${page}`}
            style={styles.pageEllipsis}
          >
            ...
          </span>
        );
      }

      items.push(
        <button
          key={page}
          onClick={() =>
            setCurrentPage(page)
          }
          style={{
            ...styles.pageNumber,
            ...(currentPage === page
              ? styles.pageNumberActive
              : {}),
          }}
        >
          {page + 1}
        </button>
      );
    }

    return items;
  };
  // const renderUnit=(type:SensorRecord['type'])=>{
  //   const typeUnit = {
  //     temperature: "°C",
  //     humidity: "%",
  //     light: "Lux"
  //   };
  //   return typeUnit[type];
  // }
  const renderTypeBadge = (
    type: SensorRecord['type'],
    typeName: string
  ) => {
    const typeColors = {
      temperature: '#d97706',
      humidity: '#2563eb',
      light: '#16a34a',
      gas: '#dc2626',
      smoke: '#ea580c',
      motion: '#2563eb',
    };

    const color =
      typeColors[type] || '#6b7280';

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
                ? '#2563eb'
                : '#9ca3af'
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
                setSearchValue('');
                setCurrentPage(0);
              }}
              style={styles.selectInput}
            >
              <option
                value="all"
                style={styles.selectOption}
              >
                Tất cả
              </option>

              <option
                value="temperature"
                style={styles.selectOption}
              >
                Nhiệt độ
              </option>

              <option
                value="humidity"
                style={styles.selectOption}
              >
                Độ ẩm
              </option>

              <option
                value="light"
                style={styles.selectOption}
              >
                Ánh sáng
              </option>
              <option
                value="gas"
                style={styles.selectOption}
              >
                Khí gas
              </option>
              <option
                value="smoke"
                style={styles.selectOption}
              >
                Khói
              </option>
              <option
                value="motion"
                style={styles.selectOption}
              >
                Chuyển động
              </option>
              <option
                value="time"
                style={styles.selectOption}
              >
                Thời gian
              </option>
            </select>

            <span style={styles.selectIcon}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6b7280"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </div>

          <div style={styles.selectWrapper}>
            <input
              type={isSensorSearch ? 'number' : 'text'}
              step="any"
              placeholder={
                isAllSearch
                  ? 'Giá trị, thời gian hoặc loại'
                  : isTimeSearch
                    ? 'YYYY-MM-DD HH:mm:ss'
                    : 'Nhập giá trị'
              }
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                setCurrentPage(0);
              }}
              style={styles.searchInput}
            />

            {searchValue && (
              <button
                onClick={() => {
                  setSearchValue('');
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
            <thead style={styles.tableHead}>
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

                    <td style={{...styles.td}}>
                      {row.value}
                    </td>

                    <td style={styles.tdTime}>
                      <div
                        style={styles.timeCell}
                      >
                        <span
                          style={styles.timeText}
                        >
                          {row.timestamp}
                        </span>

                        <button
                          type="button"
                          aria-label={`Sao chép thời gian ${row.timestamp}`}
                          title={
                            copiedId ===
                            row.id
                              ? 'Đã sao chép'
                              : 'Sao chép thời gian'
                          }
                          onClick={() =>
                            copyTimestamp(
                              row.id,
                              row.timestamp
                            )
                          }
                          style={{
                            ...styles.copyBtn,
                            ...(copiedId ===
                            row.id
                              ? styles.copyBtnCopied
                              : {}),
                          }}
                        >
                          {copiedId ===
                          row.id ? (
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect
                                x="9"
                                y="9"
                                width="12"
                                height="12"
                                rx="2"
                              />

                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    style={styles.emptyTd}
                  >
                    {loading
                      ? 'Đang tải dữ liệu...'
                      : errorMsg ||
                        'Không tìm thấy dữ liệu phù hợp'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.pagination}>
          <div style={styles.pageSizeGroup}>
            <span style={styles.pageSizeLabel}>
              Hiển thị
            </span>

            <div
              style={{
                ...styles.selectWrapper,
                flexShrink: 0,
              }}
            >
              <select
                value={pageSize}
                onChange={(e) =>
                  handlePageSizeChange(
                    Number(e.target.value)
                  )
                }
                style={styles.pageSizeSelect}
              >
                {PAGE_SIZE_OPTIONS.map(
                  (size) => (
                    <option
                      key={size}
                      value={size}
                      style={styles.selectOption}
                    >
                      {size}
                    </option>
                  )
                )}
              </select>

              <span
                style={
                  styles.pageSizeSelectIcon
                }
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6b7280"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>

            <span style={styles.pageSizeLabel}>
              bản ghi
            </span>
          </div>

          <div style={styles.paginationControls}>
            <button
              style={{
                ...styles.pageArrow,
                opacity:
                  currentPage === 0
                    ? 0.35
                    : 1,
              }}
              disabled={currentPage === 0}
              onClick={() =>
                setCurrentPage(0)
              }
              title="Trang đầu"
            >
              «
            </button>

            <button
              style={{
                ...styles.pageArrow,
                opacity:
                  currentPage === 0
                    ? 0.35
                    : 1,
              }}
              disabled={currentPage === 0}
              onClick={() =>
                setCurrentPage(
                  (page) => page - 1
                )
              }
              title="Trang trước"
            >
              ‹
            </button>

            <div style={styles.pageNumbers}>
              {renderPaginationItems()}
            </div>

            <button
              style={{
                ...styles.pageArrow,
                opacity:
                  totalPages === 0 ||
                    currentPage >=
                    totalPages - 1
                    ? 0.35
                    : 1,
              }}
              disabled={
                totalPages === 0 ||
                currentPage >=
                totalPages - 1
              }
              onClick={() =>
                setCurrentPage(
                  (page) => page + 1
                )
              }
              title="Trang sau"
            >
              ›
            </button>

            <button
              style={{
                ...styles.pageArrow,
                opacity:
                  totalPages === 0 ||
                    currentPage >=
                    totalPages - 1
                    ? 0.35
                    : 1,
              }}
              disabled={
                totalPages === 0 ||
                currentPage >=
                totalPages - 1
              }
              onClick={() =>
                setCurrentPage(
                  totalPages - 1
                )
              }
              title="Trang cuối"
            >
              »
            </button>
          </div>

          <form
            style={styles.pageJump}
            onSubmit={handleJumpPage}
          >
            <span style={styles.pageSizeLabel}>
              Đến trang
            </span>

            <input
              type="number"
              min={1}
              max={totalPages || 1}
              value={jumpPage}
              onChange={(e) =>
                setJumpPage(e.target.value)
              }
              placeholder={String(
                currentPage + 1
              )}
              disabled={totalPages === 0}
              style={styles.pageJumpInput}
            />

            <span style={styles.pageSizeLabel}>
              / {totalPages}
            </span>
          </form>

          <span style={styles.totalInfo}>
            {totalElements > 0
              ? `${currentPage * pageSize + 1}-${Math.min(
                (currentPage + 1) * pageSize,
                totalElements
              )} / ${totalElements}`
              : '0 / 0'}
          </span>
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
    color: '#111827',
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
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    color: '#111827',
    colorScheme: 'light',
    fontSize:
      'clamp(11px, 0.9vw, 14px)',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    minWidth: 'clamp(130px, 14vw, 160px)',
    maxWidth: '100%',
    boxSizing: 'border-box',
  },

  selectOption: {
    backgroundColor: '#ffffff',
    color: '#111827',
  },

  searchInput: {
    height: 'clamp(34px, 3vw, 40px)',
    padding:
      '0 clamp(28px, 2.5vw, 32px) 0 clamp(10px, 1.2vw, 16px)',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    color: '#111827',
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
    color: '#6b7280',
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
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    boxShadow:
      '0 4px 12px rgba(15, 23, 42, 0.05)',
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
    minHeight: 0,
    flex: '1 1 0',
    overflowY: 'auto',
    overflowX: 'hidden',
    boxSizing: 'border-box',
    scrollbarWidth: 'thin',
  },

  table: {
    width: '100%',
    minWidth: 0,
    borderCollapse: 'collapse',
    textAlign: 'left',
    tableLayout: 'fixed',
  },

  tableHead: {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    background: '#f8fafc',
  },

  th: {
    padding:
      'clamp(8px, 1vw, 18px) clamp(8px, 1.5vw, 24px)',
    fontSize:
      'clamp(9px, 0.75vw, 12px)',
    fontWeight: 700,
    color: '#6b7280',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #e5e7eb',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    background: '#f8fafc',
  },

  tr: {
    borderBottom: '1px solid #f1f5f9',
  },

  tdId: {
    padding:
      'clamp(8px, 1vw, 18px) clamp(8px, 1.5vw, 24px)',
    fontSize:
      'clamp(10px, 0.85vw, 14px)',
    color: '#111827',
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
    color: '#111827',
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
    color: '#6b7280',
    textAlign: 'right',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
  },

  timeCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '6px',
    minWidth: 0,
  },

  timeText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },

  copyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    minWidth: '24px',
    padding: 0,
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    background: '#ffffff',
    color: '#6b7280',
    cursor: 'pointer',
    flexShrink: 0,
    transition:
      'background 0.2s ease, border-color 0.2s ease, color 0.2s ease',
  },

  copyBtnCopied: {
    borderColor: '#86efac',
    background: '#f0fdf4',
    color: '#16a34a',
  },

  emptyTd: {
    padding:
      'clamp(20px, 2.5vw, 32px) clamp(12px, 1.5vw, 24px)',
    textAlign: 'center',
    color: '#6b7280',
    fontSize:
      'clamp(11px, 0.9vw, 14px)',
  },

  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'clamp(8px, 1vw, 14px)',
    padding:
      'clamp(8px, 1vw, 16px) clamp(10px, 1.5vw, 24px)',
    borderTop: '1px solid #e5e7eb',
    flexShrink: 0,
    minHeight: 'clamp(48px, 4vw, 60px)',
    boxSizing: 'border-box',
    flexWrap: 'wrap',
    background: '#ffffff',
  },

  pageSizeGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: 0,
    flexShrink: 0,
  },

  pageSizeLabel: {
    fontSize:
      'clamp(10px, 0.85vw, 13px)',
    color: '#6b7280',
    whiteSpace: 'nowrap',
  },

  pageSizeSelect: {
    height: '32px',
    padding: '0 26px 0 10px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '7px',
    color: '#111827',
    colorScheme: 'light',
    fontSize:
      'clamp(10px, 0.85vw, 13px)',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    width: '68px',
    boxSizing: 'border-box',
  },

  pageSizeSelectIcon: {
    position: 'absolute',
    right: '8px',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
  },

  pageJump: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    flexShrink: 0,
  },

  pageJumpInput: {
    width: '52px',
    height: '32px',
    padding: '0 6px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '7px',
    color: '#111827',
    fontSize:
      'clamp(10px, 0.85vw, 13px)',
    textAlign: 'center',
    outline: 'none',
    boxSizing: 'border-box',
  },

  paginationControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    minWidth: 0,
  },

  pageNumbers: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  },

  pageArrow: {
    width: '30px',
    height: '30px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: '6px',
    color: '#6b7280',
    fontSize: '18px',
    lineHeight: 1,
    cursor: 'pointer',
    padding: 0,
    transition:
      'background 0.2s ease, color 0.2s ease',
  },

  pageNumber: {
    minWidth: '30px',
    height: '30px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: '6px',
    color: '#6b7280',
    fontSize:
      'clamp(10px, 0.85vw, 13px)',
    fontWeight: 500,
    cursor: 'pointer',
    padding: '0 6px',
    transition:
      'background 0.2s ease, color 0.2s ease, border 0.2s ease',
  },

  pageNumberActive: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#2563eb',
    fontWeight: 700,
  },

  pageEllipsis: {
    minWidth: '24px',
    height: '30px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    fontSize:
      'clamp(10px, 0.85vw, 13px)',
    userSelect: 'none',
  },

  totalInfo: {
    fontSize:
      'clamp(10px, 0.85vw, 13px)',
    color: '#6b7280',
    whiteSpace: 'nowrap',
    minWidth: '70px',
    textAlign: 'right',
    flexShrink: 0,
  },
};

export default SensorData;
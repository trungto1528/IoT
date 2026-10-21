import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Device {
    name: string;
    deviceNumber: number;
}

interface ActivityItem {
    id: number;
    uid: number;
    userName: string | null;
    device: Device | null;
    action: string;
    status: string;
    time: string;
}

type SortField =
    | 'id'
    | 'deviceNumber'
    | 'action'
    | 'time'
    | 'status';

type SortDirection = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const formatTime = (time: string) => {
    if (!time) {
        return '';
    }

    return time.replace('T', ' ');
};

const isValidTimeFilter = (value: string) => {
    return (
        /^\d{4}$/.test(value) ||
        /^\d{4}-\d{2}$/.test(value) ||
        /^\d{4}-\d{2}-\d{2}$/.test(value) ||
        /^\d{4}-\d{2}-\d{2} \d{2}$/.test(value) ||
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value) ||
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(
            value
        )
    );
};


interface PageResponse {
    content: ActivityItem[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
}

export function ActivityHistory() {
    const navigate = useNavigate();

    const [activities, setActivities] =
        useState<ActivityItem[]>([]);

    const [userFilter, setUserFilter] = useState('');
    const [deviceFilter, setDeviceFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [timeFilter, setTimeFilter] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [jumpPage, setJumpPage] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [sortField, setSortField] =
        useState<SortField>('id');

    const [sortDir, setSortDir] =
        useState<SortDirection>('desc');

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const isLoggedIn =
            localStorage.getItem('isLoggedIn');

        if (isLoggedIn !== 'true') {
            navigate('/');
        }
    }, [navigate]);

    useEffect(() => {
        const controller = new AbortController();

        const timeoutId = setTimeout(async () => {
            try {
                setLoading(true);
                setErrorMsg('');

                const params = new URLSearchParams({
                    page: String(currentPage - 1),
                    size: String(pageSize),
                    sort: `${sortField},${sortDir}`,
                });

                if (userFilter.trim()) {
                    params.set('user', userFilter.trim());
                }

                if (deviceFilter) {
                    params.set('device', deviceFilter);
                }

                if (actionFilter) {
                    params.set('action', actionFilter);
                }

                if (statusFilter) {
                    params.set('status', statusFilter);
                }

                const time = timeFilter.trim();

                if (time && isValidTimeFilter(time)) {
                    params.set('time', time);
                }

                const response = await fetch(
                    `http://localhost:8080/api/actions?${params.toString()}`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error(
                        'Không thể lấy lịch sử hoạt động'
                    );
                }

                const data: PageResponse =
                    await response.json();

                setActivities(data.content);
                setTotalPages(data.totalPages);
                setTotalElements(data.totalElements);
            } catch (error) {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return;
                }

                console.error(
                    'Lỗi lấy lịch sử hoạt động:',
                    error
                );

                setActivities([]);
                setTotalPages(0);
                setTotalElements(0);
                setErrorMsg(
                    'Không thể tải lịch sử hoạt động.'
                );
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
        sortField,
        sortDir,
        userFilter,
        deviceFilter,
        actionFilter,
        statusFilter,
        timeFilter,
    ]);

    const paginatedActivities = activities;

    const handleUserChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setUserFilter(e.target.value);
        setCurrentPage(1);
    };

    const handleDeviceChange = (
        e: React.ChangeEvent<HTMLSelectElement>
    ) => {
        setDeviceFilter(e.target.value);
        setCurrentPage(1);
    };

    const handleActionChange = (
        e: React.ChangeEvent<HTMLSelectElement>
    ) => {
        setActionFilter(e.target.value);
        setCurrentPage(1);
    };

    const handleStatusChange = (
        e: React.ChangeEvent<HTMLSelectElement>
    ) => {
        setStatusFilter(e.target.value);
        setCurrentPage(1);
    };

    const handleTimeChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setTimeFilter(e.target.value);
        setCurrentPage(1);
    };

    const handlePageSizeChange = (
        e: React.ChangeEvent<HTMLSelectElement>
    ) => {
        setPageSize(Number(e.target.value));
        setCurrentPage(1);
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

        setCurrentPage(page);
        setJumpPage('');
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(prev =>
                prev === 'asc'
                    ? 'desc'
                    : 'asc'
            );
        } else {
            setSortField(field);
            setSortDir('asc');
        }

        setCurrentPage(1);
    };

    const renderSortIcon = (
        field: SortField
    ) => {
        if (sortField !== field) {
            return (
                <span
                    style={
                        styles.sortIconInactive
                    }
                >
                    ↕
                </span>
            );
        }

        return (
            <span
                style={
                    styles.sortIconActive
                }
            >
                {sortDir === 'asc'
                    ? '▲'
                    : '▼'}
            </span>
        );
    };

    const renderStatus = (
        status: string
    ) => {
        let statusStyle =
            styles.statusDefault;

        if (
            status === 'Thành công' ||
            status === 'SUCCESS'
        ) {
            statusStyle =
                styles.statusSuccess;
        } else if (status === 'Loading') {
            statusStyle =
                styles.statusLoading;
        } else if (status === 'Timeout') {
            statusStyle =
                styles.statusTimeout;
        }

        return (
            <span
                style={{
                    ...styles.statusBadge,
                    ...statusStyle,
                }}
            >
                {status}
            </span>
        );
    };

    const firstItem =
        totalElements === 0
            ? 0
            : (currentPage - 1) *
                  pageSize +
              1;

    const lastItem = Math.min(
        currentPage * pageSize,
        totalElements
    );

    const getPageNumbers = () => {
        if (totalPages <= 7) {
            return Array.from(
                { length: totalPages },
                (_, index) => index + 1
            );
        }

        const pages: (
            | number
            | string
        )[] = [1];

        if (currentPage > 4) {
            pages.push('...');
        }

        const start = Math.max(
            2,
            currentPage - 2
        );

        const end = Math.min(
            totalPages - 1,
            currentPage + 2
        );

        for (
            let page = start;
            page <= end;
            page++
        ) {
            pages.push(page);
        }

        if (
            currentPage <
            totalPages - 3
        ) {
            pages.push('...');
        }

        pages.push(totalPages);

        return pages;
    };
    return (
        <div style={styles.container}>
            <div style={styles.headerRow}>
                <h1 style={styles.pageTitle}>
                    Lịch sử hoạt động
                </h1>
            </div>

            <div style={styles.filterCard}>
                <div style={styles.filterRow}>
                    <input
                        type="text"
                        value={timeFilter}
                        onChange={handleTimeChange}
                        placeholder="YYYY-MM-DD HH:MM:SS"
                        style={styles.filterInput}
                    />

                    <input
                        type="text"
                        placeholder="Người thực hiện"
                        value={userFilter}
                        onChange={handleUserChange}
                        style={styles.filterInput}
                    />

                    <select
                        value={deviceFilter}
                        onChange={handleDeviceChange}
                        style={styles.filterSelect}
                    >
                        <option
                            value=""
                            style={styles.selectOption}
                        >
                            Tất cả thiết bị
                        </option>

                        <option
                            value="LED 1"
                            style={styles.selectOption}
                        >
                            LED 1
                        </option>

                        <option
                            value="LED 2"
                            style={styles.selectOption}
                        >
                            LED 2
                        </option>

                        <option
                            value="LED 3"
                            style={styles.selectOption}
                        >
                            LED 3
                        </option>

                        <option
                            value="LED 4"
                            style={styles.selectOption}
                        >
                            LED 4
                        </option>
                    </select>

                    <select
                        value={actionFilter}
                        onChange={handleActionChange}
                        style={styles.filterSelect}
                    >
                        <option
                            value=""
                            style={styles.selectOption}
                        >
                            Tất cả hành động
                        </option>

                        <option
                            value="Bật"
                            style={styles.selectOption}
                        >
                            Bật
                        </option>

                        <option
                            value="Tắt"
                            style={styles.selectOption}
                        >
                            Tắt
                        </option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={handleStatusChange}
                        style={styles.filterSelect}
                    >
                        <option
                            value=""
                            style={styles.selectOption}
                        >
                            Tất cả trạng thái
                        </option>

                        <option
                            value="Thành công"
                            style={styles.selectOption}
                        >
                            Thành công
                        </option>

                        <option
                            value="Loading"
                            style={styles.selectOption}
                        >
                            Loading
                        </option>

                        <option
                            value="Timeout"
                            style={styles.selectOption}
                        >
                            Timeout
                        </option>
                    </select>
                </div>
            </div>

            <div style={styles.tableCard}>
                <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                        <colgroup>
                            <col
                                style={{
                                    width: '7%',
                                }}
                            />
                            <col
                                style={{
                                    width: '19%',
                                }}
                            />
                            <col
                                style={{
                                    width: '21%',
                                }}
                            />
                            <col
                                style={{
                                    width: '15%',
                                }}
                            />
                            <col
                                style={{
                                    width: '23%',
                                }}
                            />
                            <col
                                style={{
                                    width: '15%',
                                }}
                            />
                        </colgroup>

                        <thead style={styles.tableHead}>
                            <tr>
                                <th
                                    onClick={() =>
                                        handleSort('id')
                                    }
                                    style={
                                        styles.thSortable
                                    }
                                >
                                    ID
                                    {renderSortIcon('id')}
                                </th>

                                <th style={styles.th}>
                                    NGƯỜI THỰC HIỆN
                                </th>

                                <th
                                    onClick={() =>
                                        handleSort(
                                            'deviceNumber'
                                        )
                                    }
                                    style={
                                        styles.thSortable
                                    }
                                >
                                    TÊN THIẾT BỊ
                                    {renderSortIcon(
                                        'deviceNumber'
                                    )}
                                </th>

                                <th
                                    onClick={() =>
                                        handleSort(
                                            'action'
                                        )
                                    }
                                    style={
                                        styles.thSortable
                                    }
                                >
                                    HÀNH ĐỘNG
                                    {renderSortIcon(
                                        'action'
                                    )}
                                </th>

                                <th
                                    onClick={() =>
                                        handleSort('time')
                                    }
                                    style={
                                        styles.thSortable
                                    }
                                >
                                    THỜI GIAN
                                    {renderSortIcon('time')}
                                </th>

                                <th
                                    onClick={() =>
                                        handleSort(
                                            'status'
                                        )
                                    }
                                    style={
                                        styles.thSortableRight
                                    }
                                >
                                    TRẠNG THÁI
                                    {renderSortIcon(
                                        'status'
                                    )}
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {paginatedActivities.length >
                            0 ? (
                                paginatedActivities.map(
                                    item => (
                                        <tr
                                            key={item.id}
                                            style={styles.tr}
                                        >
                                            <td
                                                style={
                                                    styles.tdId
                                                }
                                            >
                                                {item.id}
                                            </td>

                                            <td
                                                style={
                                                    styles.td
                                                }
                                            >
                                                <div
                                                    style={
                                                        styles.userCell
                                                    }
                                                >
                                                    {item.userName ||
                                                        `UID: ${item.uid}`}
                                                </div>
                                            </td>

                                            <td
                                                style={
                                                    styles.td
                                                }
                                            >
                                                <div
                                                    style={
                                                        styles.deviceCell
                                                    }
                                                >
                                                    {item.device
                                                        ?.name ||
                                                        'Không xác định'}
                                                </div>
                                            </td>

                                            <td
                                                style={
                                                    styles.td
                                                }
                                            >
                                                {item.action}
                                            </td>

                                            <td
                                                style={
                                                    styles.tdTime
                                                }
                                            >
                                                {formatTime(
                                                    item.time
                                                )}
                                            </td>

                                            <td
                                                style={
                                                    styles.tdRight
                                                }
                                            >
                                                {renderStatus(
                                                    item.status
                                                )}
                                            </td>
                                        </tr>
                                    )
                                )
                            ) : (
                                <tr>
                                    <td
                                        colSpan={6}
                                        style={
                                            styles.emptyTd
                                        }
                                    >
                                        {loading
                                            ? 'Đang tải dữ liệu...'
                                            : errorMsg ||
                                              'Không có lịch sử hoạt động'}
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

                        <div style={styles.selectWrapper}>
                            <select
                                value={pageSize}
                                onChange={handlePageSizeChange}
                                style={styles.pageSizeSelect}
                            >
                                {PAGE_SIZE_OPTIONS.map(size => (
                                    <option
                                        key={size}
                                        value={size}
                                        style={styles.selectOption}
                                    >
                                        {size}
                                    </option>
                                ))}
                            </select>

                            <span style={styles.pageSizeSelectIcon}>
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
                                    currentPage === 1
                                        ? 0.35
                                        : 1,
                                cursor:
                                    currentPage === 1
                                        ? 'not-allowed'
                                        : 'pointer',
                            }}
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(1)}
                            title="Trang đầu"
                        >
                            «
                        </button>

                        <button
                            style={{
                                ...styles.pageArrow,
                                opacity:
                                    currentPage === 1
                                        ? 0.35
                                        : 1,
                                cursor:
                                    currentPage === 1
                                        ? 'not-allowed'
                                        : 'pointer',
                            }}
                            disabled={currentPage === 1}
                            onClick={() =>
                                setCurrentPage(prev =>
                                    Math.max(1, prev - 1)
                                )
                            }
                            title="Trang trước"
                        >
                            ‹
                        </button>

                        <div style={styles.pageNumbers}>
                            {getPageNumbers().map(
                                (page, index) =>
                                    page === '...' ? (
                                        <span
                                            key={`ellipsis-${index}`}
                                            style={styles.pageEllipsis}
                                        >
                                            ...
                                        </span>
                                    ) : (
                                        <button
                                            key={page}
                                            style={{
                                                ...styles.pageNumber,
                                                ...(currentPage === page
                                                    ? styles.pageNumberActive
                                                    : {}),
                                            }}
                                            onClick={() =>
                                                setCurrentPage(
                                                    page as number
                                                )
                                            }
                                        >
                                            {page}
                                        </button>
                                    )
                            )}
                        </div>

                        <button
                            style={{
                                ...styles.pageArrow,
                                opacity:
                                    totalPages === 0 ||
                                    currentPage >= totalPages
                                        ? 0.35
                                        : 1,
                                cursor:
                                    totalPages === 0 ||
                                    currentPage >= totalPages
                                        ? 'not-allowed'
                                        : 'pointer',
                            }}
                            disabled={
                                totalPages === 0 ||
                                currentPage >= totalPages
                            }
                            onClick={() =>
                                setCurrentPage(prev =>
                                    Math.min(
                                        totalPages,
                                        prev + 1
                                    )
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
                                    currentPage >= totalPages
                                        ? 0.35
                                        : 1,
                                cursor:
                                    totalPages === 0 ||
                                    currentPage >= totalPages
                                        ? 'not-allowed'
                                        : 'pointer',
                            }}
                            disabled={
                                totalPages === 0 ||
                                currentPage >= totalPages
                            }
                            onClick={() =>
                                setCurrentPage(totalPages)
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
                            placeholder={String(currentPage)}
                            disabled={totalPages === 0}
                            style={styles.pageJumpInput}
                        />

                        <span style={styles.pageSizeLabel}>
                            / {totalPages}
                        </span>
                    </form>

                    <span style={styles.totalInfo}>
                        {totalElements > 0
                            ? `${firstItem}-${lastItem} / ${totalElements}`
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
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        gap: 'clamp(10px, 1.5vw, 16px)',
        overflow: 'hidden',
        boxSizing: 'border-box',
    },

    headerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minWidth: 0,
        flexShrink: 0,
    },

    pageTitle: {
        margin: 0,
        fontSize: 'clamp(20px, 2.2vw, 28px)',
        lineHeight: 1.2,
        fontWeight: 700,
        color: '#111827',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },

    filterCard: {
        width: '100%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: 'clamp(9px, 1.2vw, 18px)',
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        borderRadius: '12px',
        flexShrink: 0,
        boxSizing: 'border-box',
    },

    filterRow: {
        width: '100%',
        minWidth: 0,
        display: 'grid',
        gridTemplateColumns:
            'repeat(5, minmax(0, 1fr))',
        gap: 'clamp(6px, 0.8vw, 12px)',
    },

    filterInput: {
        width: '100%',
        minWidth: 0,
        height: 'clamp(34px, 3vw, 40px)',
        padding: '0 clamp(7px, 0.8vw, 12px)',
        background: '#ffffff',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        color: '#111827',
        fontSize: 'clamp(10px, 0.9vw, 14px)',
        outline: 'none',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
    },

    filterSelect: {
        width: '100%',
        minWidth: 0,
        height: 'clamp(34px, 3vw, 40px)',
        padding: '0 clamp(5px, 0.8vw, 12px)',
        backgroundColor: '#ffffff',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        color: '#111827',
        fontSize: 'clamp(10px, 0.9vw, 14px)',
        outline: 'none',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        colorScheme: 'light',
        cursor: 'pointer',
    },

    selectOption: {
        backgroundColor: '#ffffff',
        color: '#111827',
    },

    tableCard: {
        width: '100%',
        minWidth: 0,
        minHeight: 0,
        flex: '1 1 auto',
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
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
        tableLayout: 'fixed',
        borderCollapse: 'collapse',
        textAlign: 'left',
    },

    tableHead: {
        position: 'sticky',
        top: 0,
        zIndex: 2,
        background: '#f8fafc',
    },

    th: {
        padding: 'clamp(7px, 0.8vw, 12px)',
        fontSize: 'clamp(9px, 0.75vw, 12px)',
        lineHeight: 1.2,
        fontWeight: 700,
        color: '#6b7280',
        letterSpacing: '0.3px',
        borderBottom: '1px solid #e5e7eb',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        boxSizing: 'border-box',
        background: '#f8fafc',
    },

    thSortable: {
        padding: 'clamp(7px, 0.8vw, 12px)',
        fontSize: 'clamp(9px, 0.75vw, 12px)',
        lineHeight: 1.2,
        fontWeight: 700,
        color: '#6b7280',
        letterSpacing: '0.3px',
        borderBottom: '1px solid #e5e7eb',
        userSelect: 'none',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        boxSizing: 'border-box',
        background: '#f8fafc',
    },

    thSortableRight: {
        padding: 'clamp(7px, 0.8vw, 12px)',
        fontSize: 'clamp(9px, 0.75vw, 12px)',
        lineHeight: 1.2,
        fontWeight: 700,
        color: '#6b7280',
        letterSpacing: '0.3px',
        borderBottom: '1px solid #e5e7eb',
        userSelect: 'none',
        cursor: 'pointer',
        textAlign: 'right',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        boxSizing: 'border-box',
        background: '#f8fafc',
    },

    tr: {
        borderBottom: '1px solid #f1f5f9',
    },

    tdId: {
        padding: 'clamp(6px, 0.7vw, 10px)',
        fontSize: 'clamp(10px, 0.85vw, 14px)',
        color: '#111827',
        fontWeight: 500,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
    },

    td: {
        padding: 'clamp(6px, 0.7vw, 10px)',
        fontSize: 'clamp(10px, 0.85vw, 14px)',
        color: '#111827',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
    },

    tdRight: {
        padding: 'clamp(6px, 0.7vw, 10px)',
        fontSize: 'clamp(10px, 0.85vw, 14px)',
        color: '#111827',
        textAlign: 'right',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
    },

    userCell: {
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },

    deviceCell: {
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },

    tdTime: {
        padding: 'clamp(6px, 0.7vw, 10px)',
        fontSize: 'clamp(10px, 0.85vw, 14px)',
        color: '#6b7280',
        textAlign: 'left',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
    },

    emptyTd: {
        padding:
            'clamp(16px, 2vw, 32px) clamp(10px, 1.2vw, 24px)',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: 'clamp(11px, 0.85vw, 14px)',
    },

    statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: '100%',
        padding:
            'clamp(2px, 0.35vw, 4px) clamp(5px, 0.6vw, 9px)',
        borderRadius: '999px',
        fontSize: 'clamp(9px, 0.7vw, 12px)',
        fontWeight: 600,
        lineHeight: 1.3,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        boxSizing: 'border-box',
    },

    statusSuccess: {
        background: '#dcfce7',
        color: '#15803d',
    },

    statusLoading: {
        background: '#e0f2fe',
        color: '#0369a1',
    },

    statusTimeout: {
        background: '#fef3c7',
        color: '#b45309',
    },

    statusDefault: {
        background: '#f1f5f9',
        color: '#64748b',
    },

    sortIconInactive: {
        opacity: 0.45,
        marginLeft: '4px',
    },

    sortIconActive: {
        marginLeft: '4px',
        color: '#16a34a',
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

    selectWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        minWidth: 0,
        maxWidth: '100%',
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

export default ActivityHistory;

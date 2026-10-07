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

interface PageResponse {
    content: ActivityItem[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
}

type SortField =
    | 'id'
    | 'deviceNumber'
    | 'action'
    | 'time'
    | 'status';

type SortDirection = 'asc' | 'desc';

export function ActivityHistory() {
    const navigate = useNavigate();

    const [activities, setActivities] =
        useState<ActivityItem[]>([]);

    const [userFilter, setUserFilter] =
        useState('');

    const [deviceFilter, setDeviceFilter] =
        useState('');

    const [actionFilter, setActionFilter] =
        useState('');

    const [statusFilter, setStatusFilter] =
        useState('');

    const [timeFilter, setTimeFilter] =
        useState('');

    const [currentPage, setCurrentPage] =
        useState(0);

    const [totalPages, setTotalPages] =
        useState(0);

    const PAGE_SIZE = 10;

    const [sortField, setSortField] =
        useState<SortField>('id');

    const [sortDir, setSortDir] =
        useState<SortDirection>('desc');

    const [loading, setLoading] =
        useState(false);

    const [errorMsg, setErrorMsg] =
        useState('');

    useEffect(() => {
        const isLoggedIn =
            localStorage.getItem('isLoggedIn');

        if (isLoggedIn !== 'true') {
            navigate('/');
        }
    }, [navigate]);

    useEffect(() => {
        fetchActions(
            currentPage,
            sortField,
            sortDir
        );
    }, [
        currentPage,
        sortField,
        sortDir,
        userFilter,
        deviceFilter,
        actionFilter,
        statusFilter,
        timeFilter,
    ]);

    const fetchActions = async (
        page: number,
        field: SortField,
        dir: SortDirection
    ) => {
        setLoading(true);
        setErrorMsg('');

        try {
            const params =
                new URLSearchParams();

            params.set(
                'page',
                String(page)
            );

            params.set(
                'size',
                String(PAGE_SIZE)
            );

            params.set(
                'sort',
                `${field},${dir}`
            );

            if (userFilter.trim()) {
                params.set(
                    'user',
                    userFilter.trim()
                );
            }

            if (deviceFilter.trim()) {
                params.set(
                    'device',
                    deviceFilter.trim()
                );
            }

            if (actionFilter) {
                params.set(
                    'action',
                    actionFilter
                );
            }

            if (statusFilter) {
                params.set(
                    'status',
                    statusFilter
                );
            }

            if (isValidTimeFilter(timeFilter)) {
                params.set(
                    'time',
                    timeFilter.trim()
                );
            }

            const response =
                await fetch(
                    `http://localhost:8080/api/actions?${params.toString()}`
                );

            if (!response.ok) {
                throw new Error(
                    'Không thể lấy lịch sử hoạt động'
                );
            }

            const data: PageResponse =
                await response.json();

            setActivities(
                data.content
            );

            setTotalPages(
                data.totalPages
            );
        } catch (error) {
            console.error(
                'Lỗi lấy lịch sử hoạt động:',
                error
            );

            setActivities([]);
            setTotalPages(0);

            setErrorMsg(
                'Không thể tải lịch sử hoạt động.'
            );
        } finally {
            setLoading(false);
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
    const handleUserChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setUserFilter(
            e.target.value
        );

        setCurrentPage(0);
    };

    const handleDeviceChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setDeviceFilter(
            e.target.value
        );

        setCurrentPage(0);
    };

    const handleActionChange = (
        e: React.ChangeEvent<HTMLSelectElement>
    ) => {
        setActionFilter(
            e.target.value
        );

        setCurrentPage(0);
    };

    const handleStatusChange = (
        e: React.ChangeEvent<HTMLSelectElement>
    ) => {
        setStatusFilter(
            e.target.value
        );

        setCurrentPage(0);
    };

    const handleTimeChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setTimeFilter(
            e.target.value
        );

        setCurrentPage(0);
    };

    const handleSort = (
        field: SortField
    ) => {
        if (sortField === field) {
            setSortDir(
                prev =>
                    prev === 'asc'
                        ? 'desc'
                        : 'asc'
            );
        } else {
            setSortField(field);
            setSortDir('asc');
        }

        setCurrentPage(0);
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

    const formatTime = (
        time: string
    ) => {
        if (!time) {
            return '';
        }

        return time.replace(
            'T',
            ' '
        );
    };

    const renderStatus = (
        status: string
    ) => {
        let style =
            styles.statusDefault;

        if (
            status === 'Thành công' ||
            status === 'SUCCESS'
        ) {
            style =
                styles.statusSuccess;
        } else if (
            status === 'Loading'
        ) {
            style =
                styles.statusLoading;
        } else if (
            status === 'Timeout'
        ) {
            style =
                styles.statusTimeout;
        }

        return (
            <span
                style={{
                    ...styles.statusBadge,
                    ...style,
                }}
            >
                {status}
            </span>
        );
    };

    return (
        <div style={styles.container}>
            <div style={styles.headerRow}>
                <h1
                    style={styles.pageTitle}
                >
                    Lịch sử hoạt động
                </h1>
            </div>

            <div
                style={styles.filterCard}
            >
                <div
                    style={styles.filterRow}
                >
                    <input
                        type="text"
                        value={timeFilter}
                        onChange={
                            handleTimeChange
                        }
                        placeholder="YYYY-MM-DD HH:MM:SS"
                        style={
                            styles.filterInput
                        }
                    />

                    <input
                        type="text"
                        placeholder="Người thực hiện"
                        value={userFilter}
                        onChange={
                            handleUserChange
                        }
                        style={
                            styles.filterInput
                        }
                    />

                    <input
                        type="text"
                        placeholder="Tên thiết bị"
                        value={deviceFilter}
                        onChange={
                            handleDeviceChange
                        }
                        style={
                            styles.filterInput
                        }
                    />

                    <select
                        value={actionFilter}
                        onChange={
                            handleActionChange
                        }
                        style={
                            styles.filterSelect
                        }
                    >
                        <option value="">
                            Tất cả hành động
                        </option>

                        <option value="Bật">
                            Bật
                        </option>

                        <option value="Tắt">
                            Tắt
                        </option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={
                            handleStatusChange
                        }
                        style={
                            styles.filterSelect
                        }
                    >
                        <option value="">
                            Tất cả trạng thái
                        </option>

                        <option value="Thành công">
                            Thành công
                        </option>

                        <option value="Loading">
                            Loading
                        </option>

                        <option value="Timeout">
                            Timeout
                        </option>
                    </select>
                </div>
            </div>

            {errorMsg && (
                <div
                    style={
                        styles.errorBox
                    }
                >
                    {errorMsg}
                </div>
            )}

            <div
                style={styles.tableCard}
            >
                <div
                    style={
                        styles.tableWrapper
                    }
                >
                    <table
                        style={styles.table}
                    >
                        <colgroup>
                            <col
                                style={{
                                    width:
                                        '7%',
                                }}
                            />

                            <col
                                style={{
                                    width:
                                        '19%',
                                }}
                            />

                            <col
                                style={{
                                    width:
                                        '21%',
                                }}
                            />

                            <col
                                style={{
                                    width:
                                        '15%',
                                }}
                            />

                            <col
                                style={{
                                    width:
                                        '23%',
                                }}
                            />

                            <col
                                style={{
                                    width:
                                        '15%',
                                }}
                            />
                        </colgroup>

                        <thead>
                            <tr>
                                <th
                                    onClick={() =>
                                        handleSort(
                                            'id'
                                        )
                                    }
                                    style={
                                        styles.thSortable
                                    }
                                >
                                    ID
                                    {renderSortIcon(
                                        'id'
                                    )}
                                </th>

                                <th
                                    style={
                                        styles.th
                                    }
                                >
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
                                        handleSort(
                                            'time'
                                        )
                                    }
                                    style={
                                        styles.thSortable
                                    }
                                >
                                    THỜI GIAN
                                    {renderSortIcon(
                                        'time'
                                    )}
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
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        style={
                                            styles.emptyTd
                                        }
                                    >
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : activities.length >
                                0 ? (
                                activities.map(
                                    item => (
                                        <tr
                                            key={
                                                item.id
                                            }
                                            style={
                                                styles.tr
                                            }
                                        >
                                            <td
                                                style={
                                                    styles.tdId
                                                }
                                            >
                                                {
                                                    item.id
                                                }
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
                                                    {
                                                        item.userName ||
                                                        `UID: ${item.uid}`
                                                    }
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
                                                    {
                                                        item.device
                                                            ?.name ||
                                                        'Không xác định'
                                                    }
                                                </div>
                                            </td>

                                            <td
                                                style={
                                                    styles.td
                                                }
                                            >
                                                {
                                                    item.action
                                                }
                                            </td>

                                            <td
                                                style={
                                                    styles.tdTime
                                                }
                                            >
                                                {
                                                    formatTime(
                                                        item.time
                                                    )
                                                }
                                            </td>

                                            <td
                                                style={
                                                    styles.tdRight
                                                }
                                            >
                                                {
                                                    renderStatus(
                                                        item.status
                                                    )
                                                }
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
                                        Không có lịch sử hoạt động
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div
                    style={
                        styles.pagination
                    }
                >
                    <button
                        style={{
                            ...styles.pageArrow,

                            opacity:
                                currentPage ===
                                    0 ||
                                    loading
                                    ? 0.4
                                    : 1,

                            cursor:
                                currentPage ===
                                    0 ||
                                    loading
                                    ? 'not-allowed'
                                    : 'pointer',
                        }}
                        disabled={
                            currentPage === 0 ||
                            loading
                        }
                        onClick={() =>
                            setCurrentPage(
                                currentPage - 1
                            )
                        }
                    >
                        &lt;
                    </button>

                    <span
                        style={
                            styles.pageActiveNum
                        }
                    >
                        {totalPages === 0
                            ? 0
                            : currentPage + 1}
                    </span>

                    <button
                        style={{
                            ...styles.pageArrow,

                            opacity:
                                currentPage >=
                                    totalPages -
                                    1 ||
                                    loading
                                    ? 0.4
                                    : 1,

                            cursor:
                                currentPage >=
                                    totalPages -
                                    1 ||
                                    loading
                                    ? 'not-allowed'
                                    : 'pointer',
                        }}
                        disabled={
                            currentPage >=
                            totalPages - 1 ||
                            loading
                        }
                        onClick={() =>
                            setCurrentPage(
                                currentPage + 1
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

        fontSize:
            'clamp(20px, 2.2vw, 28px)',

        lineHeight: 1.2,

        fontWeight: 700,
        color: '#ffffff',

        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },

    filterCard: {
        width: '100%',
        minWidth: 0,

        display: 'flex',
        flexDirection: 'column',

        padding:
            'clamp(9px, 1.2vw, 18px)',

        background:
            'rgba(255, 255, 255, 0.03)',

        boxShadow:
            'inset 0 0 0 1px rgba(255, 255, 255, 0.08)',

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

        gap:
            'clamp(6px, 0.8vw, 12px)',
    },

    filterInput: {
        width: '100%',
        minWidth: 0,

        height:
            'clamp(34px, 3vw, 40px)',

        padding:
            '0 clamp(7px, 0.8vw, 12px)',

        background:
            'rgba(255, 255, 255, 0.05)',

        border:
            '1px solid rgba(255, 255, 255, 0.08)',

        borderRadius: '8px',

        color: '#ffffff',

        fontSize:
            'clamp(10px, 0.9vw, 14px)',

        outline: 'none',

        fontFamily: 'inherit',

        boxSizing: 'border-box',
    },

    filterSelect: {
        width: '100%',
        minWidth: 0,

        height:
            'clamp(34px, 3vw, 40px)',

        padding:
            '0 clamp(5px, 0.8vw, 12px)',

        background: '#202331',

        border:
            '1px solid rgba(255, 255, 255, 0.08)',

        borderRadius: '8px',

        color: '#ffffff',

        fontSize:
            'clamp(10px, 0.9vw, 14px)',

        outline: 'none',

        fontFamily: 'inherit',

        boxSizing: 'border-box',
    },

    errorBox: {
        width: '100%',
        minWidth: 0,

        padding:
            'clamp(7px, 0.8vw, 10px) clamp(10px, 1vw, 14px)',

        color: '#f87171',

        background:
            'rgba(248, 113, 113, 0.1)',

        borderRadius: '8px',

        fontSize:
            'clamp(11px, 0.8vw, 14px)',

        flexShrink: 0,

        boxSizing: 'border-box',

        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },

    tableCard: {
        width: '100%',
        minWidth: 0,
        minHeight: 0,

        flex: '1 1 auto',

        background:
            'rgba(255, 255, 255, 0.03)',

        boxShadow:
            'inset 0 0 0 1px rgba(255, 255, 255, 0.08)',

        backdropFilter: 'blur(20px)',

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

        flex: '1 1 auto',

        overflow: 'hidden',

        boxSizing: 'border-box',
    },

    table: {
        width: '100%',
        height: '100%',

        tableLayout: 'fixed',

        borderCollapse: 'collapse',

        textAlign: 'left',
    },

    th: {
        padding:
            'clamp(7px, 0.8vw, 12px)',

        fontSize:
            'clamp(9px, 0.75vw, 12px)',

        lineHeight: 1.2,

        fontWeight: 700,

        color: '#8c91a0',

        letterSpacing: '0.3px',

        borderBottom:
            '1px solid rgba(255, 255, 255, 0.05)',

        userSelect: 'none',

        whiteSpace: 'nowrap',

        overflow: 'hidden',
        textOverflow: 'ellipsis',

        boxSizing: 'border-box',
    },

    thSortable: {
        padding:
            'clamp(7px, 0.8vw, 12px)',

        fontSize:
            'clamp(9px, 0.75vw, 12px)',

        lineHeight: 1.2,

        fontWeight: 700,

        color: '#8c91a0',

        letterSpacing: '0.3px',

        borderBottom:
            '1px solid rgba(255, 255, 255, 0.05)',

        userSelect: 'none',

        cursor: 'pointer',

        whiteSpace: 'nowrap',

        overflow: 'hidden',
        textOverflow: 'ellipsis',

        boxSizing: 'border-box',
    },

    thSortableRight: {
        padding:
            'clamp(7px, 0.8vw, 12px)',

        fontSize:
            'clamp(9px, 0.75vw, 12px)',

        lineHeight: 1.2,

        fontWeight: 700,

        color: '#8c91a0',

        letterSpacing: '0.3px',

        borderBottom:
            '1px solid rgba(255, 255, 255, 0.05)',

        userSelect: 'none',

        cursor: 'pointer',

        textAlign: 'right',

        whiteSpace: 'nowrap',

        overflow: 'hidden',
        textOverflow: 'ellipsis',

        boxSizing: 'border-box',
    },

    tr: {
        borderBottom:
            '1px solid rgba(255, 255, 255, 0.03)',
    },

    tdId: {
        padding:
            'clamp(6px, 0.7vw, 10px)',

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
            'clamp(6px, 0.7vw, 10px)',

        fontSize:
            'clamp(10px, 0.85vw, 14px)',

        color: '#dae2fd',

        overflow: 'hidden',

        textOverflow: 'ellipsis',

        whiteSpace: 'nowrap',

        boxSizing: 'border-box',
    },

    tdRight: {
        padding:
            'clamp(6px, 0.7vw, 10px)',

        fontSize:
            'clamp(10px, 0.85vw, 14px)',

        color: '#dae2fd',

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
        padding:
            'clamp(6px, 0.7vw, 10px)',

        fontSize:
            'clamp(10px, 0.85vw, 14px)',

        color: '#8c91a0',

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

        color: '#8c91a0',

        fontSize:
            'clamp(11px, 0.85vw, 14px)',
    },

    statusBadge: {
        display: 'inline-flex',

        alignItems: 'center',
        justifyContent: 'center',

        maxWidth: '100%',

        padding:
            'clamp(2px, 0.35vw, 4px) clamp(5px, 0.6vw, 9px)',

        borderRadius: '999px',

        fontSize:
            'clamp(9px, 0.7vw, 12px)',

        fontWeight: 600,

        lineHeight: 1.3,

        whiteSpace: 'nowrap',

        overflow: 'hidden',

        textOverflow: 'ellipsis',

        boxSizing: 'border-box',
    },

    statusSuccess: {
        background:
            'rgba(74, 222, 128, 0.12)',

        color: '#4ade80',
    },

    statusLoading: {
        background:
            'rgba(56, 189, 248, 0.12)',

        color: '#38bdf8',
    },

    statusTimeout: {
        background:
            'rgba(251, 191, 36, 0.12)',

        color: '#fbbf24',
    },

    statusDefault: {
        background:
            'rgba(148, 163, 184, 0.12)',

        color: '#cbd5e1',
    },

    sortIconInactive: {
        opacity: 0.3,
        marginLeft: '4px',
    },

    sortIconActive: {
        marginLeft: '4px',
        color: '#4ade80',
    },

    pagination: {
        display: 'flex',

        alignItems: 'center',
        justifyContent: 'flex-end',

        gap:
            'clamp(6px, 0.8vw, 12px)',

        padding:
            'clamp(6px, 0.8vw, 10px) clamp(8px, 1vw, 16px)',

        minHeight:
            'clamp(34px, 3vw, 46px)',

        borderTop:
            '1px solid rgba(255, 255, 255, 0.05)',

        flexShrink: 0,

        boxSizing: 'border-box',
    },

    pageArrow: {
        background: 'transparent',

        border: 'none',

        color: '#8c91a0',

        fontSize:
            'clamp(12px, 0.9vw, 14px)',

        cursor: 'pointer',

        padding:
            'clamp(2px, 0.4vw, 4px) clamp(5px, 0.6vw, 8px)',
    },

    pageActiveNum: {
        fontSize:
            'clamp(11px, 0.85vw, 14px)',

        fontWeight: 600,

        color: '#ffffff',

        whiteSpace: 'nowrap',
    },
};

export default ActivityHistory;
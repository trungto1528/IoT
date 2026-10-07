import React, { useEffect, useMemo, useState } from 'react';
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

const MOCK_ACTIVITIES: ActivityItem[] = [
    {
        id: 1,
        uid: 1,
        userName: 'admin',
        device: { name: 'LED 1', deviceNumber: 1 },
        action: 'Bật',
        status: 'Thành công',
        time: '2026-10-06T08:00:00',
    },
    {
        id: 2,
        uid: 1,
        userName: 'admin',
        device: { name: 'LED 2', deviceNumber: 2 },
        action: 'Tắt',
        status: 'Thành công',
        time: '2026-10-06T08:05:00',
    },
    {
        id: 3,
        uid: 2,
        userName: 'user01',
        device: { name: 'LED 3', deviceNumber: 3 },
        action: 'Bật',
        status: 'Loading',
        time: '2026-10-06T08:10:00',
    },
    {
        id: 4,
        uid: 2,
        userName: 'user01',
        device: { name: 'LED 4', deviceNumber: 4 },
        action: 'Tắt',
        status: 'Timeout',
        time: '2026-10-06T08:15:00',
    },
    {
        id: 5,
        uid: 1,
        userName: 'admin',
        device: { name: 'LED 1', deviceNumber: 1 },
        action: 'Bật',
        status: 'Thành công',
        time: '2026-10-06T08:20:00',
    },
    {
        id: 6,
        uid: 3,
        userName: 'user02',
        device: { name: 'LED 2', deviceNumber: 2 },
        action: 'Bật',
        status: 'Thành công',
        time: '2026-10-06T08:25:00',
    },
    {
        id: 7,
        uid: 3,
        userName: 'user02',
        device: { name: 'LED 3', deviceNumber: 3 },
        action: 'Tắt',
        status: 'Thành công',
        time: '2026-10-06T08:30:00',
    },
    {
        id: 8,
        uid: 1,
        userName: 'admin',
        device: { name: 'LED 4', deviceNumber: 4 },
        action: 'Bật',
        status: 'Thành công',
        time: '2026-10-06T08:35:00',
    },
    {
        id: 9,
        uid: 2,
        userName: 'user01',
        device: { name: 'LED 1', deviceNumber: 1 },
        action: 'Tắt',
        status: 'Loading',
        time: '2026-10-06T08:40:00',
    },
    {
        id: 10,
        uid: 2,
        userName: 'user01',
        device: { name: 'LED 2', deviceNumber: 2 },
        action: 'Bật',
        status: 'Thành công',
        time: '2026-10-06T08:45:00',
    },
    {
        id: 11,
        uid: 3,
        userName: 'user02',
        device: { name: 'LED 3', deviceNumber: 3 },
        action: 'Tắt',
        status: 'Thành công',
        time: '2026-10-06T08:50:00',
    },
    {
        id: 12,
        uid: 1,
        userName: 'admin',
        device: { name: 'LED 4', deviceNumber: 4 },
        action: 'Bật',
        status: 'Timeout',
        time: '2026-10-06T08:55:00',
    },
    {
        id: 13,
        uid: 1,
        userName: 'admin',
        device: { name: 'LED 1', deviceNumber: 1 },
        action: 'Tắt',
        status: 'Thành công',
        time: '2026-10-06T09:00:00',
    },
    {
        id: 14,
        uid: 2,
        userName: 'user01',
        device: { name: 'LED 2', deviceNumber: 2 },
        action: 'Bật',
        status: 'Thành công',
        time: '2026-10-06T09:05:00',
    },
    {
        id: 15,
        uid: 3,
        userName: 'user02',
        device: { name: 'LED 3', deviceNumber: 3 },
        action: 'Bật',
        status: 'Loading',
        time: '2026-10-06T09:10:00',
    },
    {
        id: 16,
        uid: 3,
        userName: 'user02',
        device: { name: 'LED 4', deviceNumber: 4 },
        action: 'Tắt',
        status: 'Thành công',
        time: '2026-10-06T09:15:00',
    },
    {
        id: 17,
        uid: 1,
        userName: 'admin',
        device: { name: 'LED 1', deviceNumber: 1 },
        action: 'Bật',
        status: 'Thành công',
        time: '2026-10-06T09:20:00',
    },
    {
        id: 18,
        uid: 2,
        userName: 'user01',
        device: { name: 'LED 2', deviceNumber: 2 },
        action: 'Tắt',
        status: 'Timeout',
        time: '2026-10-06T09:25:00',
    },
    {
        id: 19,
        uid: 2,
        userName: 'user01',
        device: { name: 'LED 3', deviceNumber: 3 },
        action: 'Bật',
        status: 'Thành công',
        time: '2026-10-06T09:30:00',
    },
    {
        id: 20,
        uid: 3,
        userName: 'user02',
        device: { name: 'LED 4', deviceNumber: 4 },
        action: 'Tắt',
        status: 'Thành công',
        time: '2026-10-06T09:35:00',
    },
    {
        id: 21,
        uid: 1,
        userName: 'admin',
        device: { name: 'LED 1', deviceNumber: 1 },
        action: 'Bật',
        status: 'Thành công',
        time: '2026-10-06T09:40:00',
    },
    {
        id: 22,
        uid: 1,
        userName: 'admin',
        device: { name: 'LED 2', deviceNumber: 2 },
        action: 'Tắt',
        status: 'Loading',
        time: '2026-10-06T09:45:00',
    },
    {
        id: 23,
        uid: 2,
        userName: 'user01',
        device: { name: 'LED 3', deviceNumber: 3 },
        action: 'Bật',
        status: 'Thành công',
        time: '2026-10-06T09:50:00',
    },
    {
        id: 24,
        uid: 3,
        userName: 'user02',
        device: { name: 'LED 4', deviceNumber: 4 },
        action: 'Bật',
        status: 'Thành công',
        time: '2026-10-06T09:55:00',
    },
    {
        id: 25,
        uid: 3,
        userName: 'user02',
        device: { name: 'LED 1', deviceNumber: 1 },
        action: 'Tắt',
        status: 'Timeout',
        time: '2026-10-06T10:00:00',
    },
    {
        id: 26,
        uid: 1,
        userName: 'admin',
        device: { name: 'LED 2', deviceNumber: 2 },
        action: 'Bật',
        status: 'Thành công',
        time: '2026-10-06T10:05:00',
    },
    {
        id: 27,
        uid: 2,
        userName: 'user01',
        device: { name: 'LED 3', deviceNumber: 3 },
        action: 'Tắt',
        status: 'Thành công',
        time: '2026-10-06T10:10:00',
    },
    {
        id: 28,
        uid: 2,
        userName: 'user01',
        device: { name: 'LED 4', deviceNumber: 4 },
        action: 'Bật',
        status: 'Loading',
        time: '2026-10-06T10:15:00',
    },
    {
        id: 29,
        uid: 3,
        userName: 'user02',
        device: { name: 'LED 1', deviceNumber: 1 },
        action: 'Bật',
        status: 'Thành công',
        time: '2026-10-06T10:20:00',
    },
    {
        id: 30,
        uid: 1,
        userName: 'admin',
        device: { name: 'LED 2', deviceNumber: 2 },
        action: 'Tắt',
        status: 'Thành công',
        time: '2026-10-06T10:25:00',
    },
    {
        id: 31,
        uid: 1,
        userName: 'admin',
        device: { name: 'LED 3', deviceNumber: 3 },
        action: 'Bật',
        status: 'Thành công',
        time: '2026-10-06T10:30:00',
    },
    {
        id: 32,
        uid: 2,
        userName: 'user01',
        device: { name: 'LED 4', deviceNumber: 4 },
        action: 'Tắt',
        status: 'Timeout',
        time: '2026-10-06T10:35:00',
    },
    {
        id: 33,
        uid: 3,
        userName: 'user02',
        device: { name: 'LED 1', deviceNumber: 1 },
        action: 'Bật',
        status: 'Thành công',
        time: '2026-10-06T10:40:00',
    },
    {
        id: 34,
        uid: 3,
        userName: 'user02',
        device: { name: 'LED 2', deviceNumber: 2 },
        action: 'Tắt',
        status: 'Loading',
        time: '2026-10-06T10:45:00',
    },
    {
        id: 35,
        uid: 1,
        userName: 'admin',
        device: { name: 'LED 3', deviceNumber: 3 },
        action: 'Bật',
        status: 'Thành công',
        time: '2026-10-06T10:50:00',
    },
    {
        id: 36,
        uid: 2,
        userName: 'user01',
        device: { name: 'LED 4', deviceNumber: 4 },
        action: 'Tắt',
        status: 'Thành công',
        time: '2026-10-06T10:55:00',
    },
    {
        id: 37,
        uid: 2,
        userName: 'user01',
        device: { name: 'LED 1', deviceNumber: 1 },
        action: 'Bật',
        status: 'Timeout',
        time: '2026-10-06T11:00:00',
    },
    {
        id: 38,
        uid: 3,
        userName: 'user02',
        device: { name: 'LED 2', deviceNumber: 2 },
        action: 'Tắt',
        status: 'Thành công',
        time: '2026-10-06T11:05:00',
    },
    {
        id: 39,
        uid: 1,
        userName: 'admin',
        device: { name: 'LED 3', deviceNumber: 3 },
        action: 'Bật',
        status: 'Thành công',
        time: '2026-10-06T11:10:00',
    },
    {
        id: 40,
        uid: 1,
        userName: 'admin',
        device: { name: 'LED 4', deviceNumber: 4 },
        action: 'Tắt',
        status: 'Loading',
        time: '2026-10-06T11:15:00',
    },
];

export function ActivityHistory() {
    const navigate = useNavigate();

    const [activities] = useState<ActivityItem[]>(
        MOCK_ACTIVITIES
    );

    const [userFilter, setUserFilter] = useState('');
    const [deviceFilter, setDeviceFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [timeFilter, setTimeFilter] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [sortField, setSortField] =
        useState<SortField>('id');

    const [sortDir, setSortDir] =
        useState<SortDirection>('desc');

    useEffect(() => {
        const isLoggedIn =
            localStorage.getItem('isLoggedIn');

        if (isLoggedIn !== 'true') {
            navigate('/');
        }
    }, [navigate]);

    const filteredActivities = useMemo(() => {
        const time = timeFilter.trim().toLowerCase();

        return activities.filter(item => {
            const userText =
                `${item.userName || ''} ${item.uid}`
                    .toLowerCase();

            const deviceText =
                item.device?.name?.toLowerCase() || '';

            const actionText =
                item.action.toLowerCase();

            const statusText =
                item.status.toLowerCase();

            const formattedTime =
                formatTime(item.time).toLowerCase();

            const matchesUser =
                !userFilter.trim() ||
                userText.includes(
                    userFilter.trim().toLowerCase()
                );

            const matchesDevice =
                !deviceFilter ||
                deviceText ===
                    deviceFilter.toLowerCase();

            const matchesAction =
                !actionFilter ||
                actionText ===
                    actionFilter.toLowerCase();

            const matchesStatus =
                !statusFilter ||
                statusText ===
                    statusFilter.toLowerCase();

            const matchesTime =
                !time ||
                formattedTime.startsWith(time);

            return (
                matchesUser &&
                matchesDevice &&
                matchesAction &&
                matchesStatus &&
                matchesTime
            );
        });
    }, [
        activities,
        userFilter,
        deviceFilter,
        actionFilter,
        statusFilter,
        timeFilter,
    ]);

    const sortedActivities = useMemo(() => {
        const result = [...filteredActivities];

        result.sort((a, b) => {
            let comparison = 0;

            switch (sortField) {
                case 'id':
                    comparison = a.id - b.id;
                    break;

                case 'deviceNumber':
                    comparison =
                        (a.device?.deviceNumber || 0) -
                        (b.device?.deviceNumber || 0);
                    break;

                case 'action':
                    comparison =
                        a.action.localeCompare(
                            b.action,
                            'vi'
                        );
                    break;

                case 'time':
                    comparison =
                        new Date(a.time).getTime() -
                        new Date(b.time).getTime();
                    break;

                case 'status':
                    comparison =
                        a.status.localeCompare(
                            b.status,
                            'vi'
                        );
                    break;
            }

            return sortDir === 'asc'
                ? comparison
                : -comparison;
        });

        return result;
    }, [filteredActivities, sortField, sortDir]);

    const totalPages = Math.max(
        1,
        Math.ceil(
            sortedActivities.length / pageSize
        )
    );

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const paginatedActivities = useMemo(() => {
        const start =
            (currentPage - 1) * pageSize;

        return sortedActivities.slice(
            start,
            start + pageSize
        );
    }, [
        sortedActivities,
        currentPage,
        pageSize,
    ]);

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
        sortedActivities.length === 0
            ? 0
            : (currentPage - 1) *
                  pageSize +
              1;

    const lastItem = Math.min(
        currentPage * pageSize,
        sortedActivities.length
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
                                        Không có lịch sử hoạt động
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={styles.pagination}>
                    <div
                        style={
                            styles.paginationLeft
                        }
                    >
                        <span
                            style={
                                styles.rangeText
                            }
                        >
                            {firstItem}-{lastItem} trên{' '}
                            {sortedActivities.length}
                        </span>

                        <select
                            value={pageSize}
                            onChange={
                                handlePageSizeChange
                            }
                            style={
                                styles.pageSizeSelect
                            }
                        >
                            {PAGE_SIZE_OPTIONS.map(
                                size => (
                                    <option
                                        key={size}
                                        value={size}
                                        style={
                                            styles.selectOption
                                        }
                                    >
                                        {size}
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    <div
                        style={
                            styles.paginationRight
                        }
                    >
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
                                setCurrentPage(1)
                            }
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
                                    Math.max(
                                        1,
                                        prev - 1
                                    )
                                )
                            }
                        >
                            ‹
                        </button>

                        {getPageNumbers().map(
                            (page, index) =>
                                page === '...' ? (
                                    <span
                                        key={`ellipsis-${index}`}
                                        style={
                                            styles.pageEllipsis
                                        }
                                    >
                                        ...
                                    </span>
                                ) : (
                                    <button
                                        key={page}
                                        style={{
                                            ...styles.pageNumber,
                                            ...(currentPage ===
                                            page
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

                        <button
                            style={{
                                ...styles.pageArrow,
                                opacity:
                                    currentPage >=
                                    totalPages
                                        ? 0.35
                                        : 1,
                                cursor:
                                    currentPage >=
                                    totalPages
                                        ? 'not-allowed'
                                        : 'pointer',
                            }}
                            disabled={
                                currentPage >=
                                totalPages
                            }
                            onClick={() =>
                                setCurrentPage(prev =>
                                    Math.min(
                                        totalPages,
                                        prev + 1
                                    )
                                )
                            }
                        >
                            ›
                        </button>

                        <button
                            style={{
                                ...styles.pageArrow,
                                opacity:
                                    currentPage >=
                                    totalPages
                                        ? 0.35
                                        : 1,
                                cursor:
                                    currentPage >=
                                    totalPages
                                        ? 'not-allowed'
                                        : 'pointer',
                            }}
                            disabled={
                                currentPage >=
                                totalPages
                            }
                            onClick={() =>
                                setCurrentPage(
                                    totalPages
                                )
                            }
                        >
                            »
                        </button>
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
        gap: 'clamp(6px, 0.8vw, 12px)',
        padding:
            'clamp(6px, 0.8vw, 10px) clamp(8px, 1vw, 16px)',
        minHeight: 'clamp(42px, 3.2vw, 50px)',
        borderTop: '1px solid #e5e7eb',
        background: '#ffffff',
        flexShrink: 0,
        boxSizing: 'border-box',
    },

    paginationLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(6px, 0.8vw, 10px)',
        minWidth: 0,
    },

    paginationRight: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '2px',
        flexShrink: 0,
    },

    rangeText: {
        color: '#6b7280',
        fontSize: 'clamp(10px, 0.8vw, 13px)',
        whiteSpace: 'nowrap',
    },

    pageSizeSelect: {
        height: 'clamp(28px, 2.5vw, 34px)',
        minWidth: 'clamp(48px, 4vw, 58px)',
        padding: '0 clamp(5px, 0.6vw, 8px)',
        backgroundColor: '#ffffff',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        color: '#111827',
        fontSize: 'clamp(10px, 0.8vw, 13px)',
        outline: 'none',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        colorScheme: 'light',
        cursor: 'pointer',
    },

    pageArrow: {
        background: 'transparent',
        border: 'none',
        color: '#6b7280',
        fontSize: 'clamp(13px, 1vw, 16px)',
        cursor: 'pointer',
        padding:
            'clamp(2px, 0.35vw, 4px) clamp(4px, 0.5vw, 7px)',
        minWidth: 'clamp(24px, 2vw, 30px)',
        height: 'clamp(26px, 2.4vw, 32px)',
    },

    pageNumber: {
        background: 'transparent',
        border: 'none',
        color: '#6b7280',
        fontSize: 'clamp(10px, 0.8vw, 13px)',
        cursor: 'pointer',
        minWidth: 'clamp(24px, 2vw, 30px)',
        height: 'clamp(26px, 2.4vw, 32px)',
        borderRadius: '6px',
        padding: 0,
    },

    pageNumberActive: {
        background: '#dcfce7',
        color: '#15803d',
        fontWeight: 600,
    },

    pageEllipsis: {
        color: '#9ca3af',
        fontSize: 'clamp(10px, 0.8vw, 13px)',
        minWidth: 'clamp(20px, 1.7vw, 26px)',
        textAlign: 'center',
    },
};

export default ActivityHistory;
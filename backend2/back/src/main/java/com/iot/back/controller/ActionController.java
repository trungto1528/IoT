package com.iot.back.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.iot.back.dto.ActionResponse;
import com.iot.back.service.ActionService;

@RestController
@RequestMapping("/api/actions")
@CrossOrigin(origins = "*")
public class ActionController {

    /*
     * Các field mà frontend được phép sort.
     *
     * Frontend gửi:
     *
     * sort=id,desc
     * sort=time,asc
     * sort=status,desc
     * ...
     */
    private static final Map<String, String> SORT_FIELDS =
            Map.of(
                    "id", "id",
                    "action", "action",
                    "status", "status",
                    "time", "time",
                    "deviceNumber", "device.deviceNumber"
            );

    private final ActionService actionService;

    public ActionController(ActionService actionService) {
        this.actionService = actionService;
    }

    @GetMapping
    public Page<ActionResponse> getActions(

            @RequestParam(defaultValue = "0")
            int page,

            @RequestParam(defaultValue = "10")
            int size,

            @RequestParam(defaultValue = "time,desc")
            String sort,

            /*
             * Filter user
             */
            @RequestParam(required = false)
            String user,

            /*
             * Filter device
             */
            @RequestParam(required = false)
            String device,

            /*
             * Filter action
             */
            @RequestParam(required = false)
            String action,

            /*
             * Filter status
             */
            @RequestParam(required = false)
            String status,

            /*
             * Filter time
             *
             * Ví dụ:
             *
             * 2026
             * 2026-10
             * 2026-10-05
             * 2026-10-05 14
             * 2026-10-05 14:30
             * 2026-10-05 14:30:25
             */
            @RequestParam(required = false)
            String time) {

        /*
         * =========================
         * VALIDATE PAGE
         * =========================
         */
        if (page < 0) {
            page = 0;
        }

        /*
         * =========================
         * VALIDATE SIZE
         * =========================
         */
        if (size <= 0) {
            size = 10;
        }

        /*
         * =========================
         * PARSE SORT
         * =========================
         *
         * sort=id,desc
         *
         * -> property = id
         * -> direction = DESC
         */
        String[] sortParts =
                sort.split(",");

        String requestedSortField =
                sortParts[0];

        String property =
                SORT_FIELDS.getOrDefault(
                        requestedSortField,
                        "time"
                );

        Sort.Direction direction =
                Sort.Direction.DESC;

        if (sortParts.length > 1) {

            try {

                direction =
                        Sort.Direction.fromString(
                                sortParts[1]
                        );

            } catch (IllegalArgumentException ignored) {

                direction =
                        Sort.Direction.DESC;
            }
        }

        PageRequest pageable =
                PageRequest.of(
                        page,
                        size,
                        Sort.by(
                                direction,
                                property
                        )
                );

        /*
         * =========================
         * PARSE TIME
         * =========================
         *
         * time là một String.
         *
         * Ví dụ:
         *
         * 2026
         *     -> 2026-01-01 00:00:00
         *     -> 2026-12-31 23:59:59.999999999
         *
         * 2026-10
         *     -> 2026-10-01 00:00:00
         *     -> 2026-10-31 23:59:59.999999999
         *
         * 2026-10-05
         *     -> cả ngày
         *
         * 2026-10-05 14
         *     -> cả giờ 14
         *
         * 2026-10-05 14:30
         *     -> cả phút 14:30
         *
         * 2026-10-05 14:30:25
         *     -> đúng giây 14:30:25
         */
        LocalDateTime from = null;
        LocalDateTime to = null;

        if (time != null && !time.isBlank()) {

            LocalDateTimeRange range =
                    parseTime(time.trim());

            if (range != null) {

                from = range.from();
                to = range.to();
            }
        }

        /*
         * =========================
         * CALL SERVICE
         * =========================
         */
        return actionService.getActions(
                user,
                device,
                action,
                status,
                from,
                to,
                pageable
        );
    }

    /**
     * Parse chuỗi thời gian thành khoảng tìm kiếm.
     */
    private LocalDateTimeRange parseTime(
            String value) {

        try {

            /*
             * =========================
             * yyyy
             * =========================
             *
             * Ví dụ:
             * 2026
             */
            if (value.matches("\\d{4}")) {

                int year =
                        Integer.parseInt(value);

                LocalDateTime from =
                        LocalDate.of(
                                year,
                                1,
                                1
                        ).atStartOfDay();

                LocalDateTime to =
                        LocalDate.of(
                                year,
                                12,
                                31
                        ).atTime(
                                LocalTime.MAX
                        );

                return new LocalDateTimeRange(
                        from,
                        to
                );
            }

            /*
             * =========================
             * yyyy-MM
             * =========================
             *
             * Ví dụ:
             * 2026-10
             */
            if (value.matches("\\d{4}-\\d{2}")) {

                YearMonth yearMonth =
                        YearMonth.parse(
                                value,
                                DateTimeFormatter.ofPattern(
                                        "yyyy-MM"
                                )
                        );

                LocalDateTime from =
                        yearMonth
                                .atDay(1)
                                .atStartOfDay();

                LocalDateTime to =
                        yearMonth
                                .atEndOfMonth()
                                .atTime(
                                        LocalTime.MAX
                                );

                return new LocalDateTimeRange(
                        from,
                        to
                );
            }

            /*
             * =========================
             * yyyy-MM-dd
             * =========================
             *
             * Ví dụ:
             * 2026-10-05
             */
            if (value.matches(
                    "\\d{4}-\\d{2}-\\d{2}"
            )) {

                LocalDate date =
                        LocalDate.parse(
                                value,
                                DateTimeFormatter.ofPattern(
                                        "yyyy-MM-dd"
                                )
                        );

                LocalDateTime from =
                        date.atStartOfDay();

                LocalDateTime to =
                        date.atTime(
                                LocalTime.MAX
                        );

                return new LocalDateTimeRange(
                        from,
                        to
                );
            }

            /*
             * =========================
             * yyyy-MM-dd HH
             * =========================
             *
             * Ví dụ:
             * 2026-10-05 14
             */
            if (value.matches(
                    "\\d{4}-\\d{2}-\\d{2} \\d{2}"
            )) {

                LocalDateTime from =
                        LocalDateTime.parse(
                                value + ":00:00",
                                DateTimeFormatter.ofPattern(
                                        "yyyy-MM-dd HH:mm:ss"
                                )
                        );

                LocalDateTime to =
                        from
                                .withMinute(59)
                                .withSecond(59)
                                .withNano(
                                        999_999_999
                                );

                return new LocalDateTimeRange(
                        from,
                        to
                );
            }

            /*
             * =========================
             * yyyy-MM-dd HH:mm
             * =========================
             *
             * Ví dụ:
             * 2026-10-05 14:30
             */
            if (value.matches(
                    "\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}"
            )) {

                LocalDateTime from =
                        LocalDateTime.parse(
                                value + ":00",
                                DateTimeFormatter.ofPattern(
                                        "yyyy-MM-dd HH:mm:ss"
                                )
                        );

                LocalDateTime to =
                        from
                                .withSecond(59)
                                .withNano(
                                        999_999_999
                                );

                return new LocalDateTimeRange(
                        from,
                        to
                );
            }

            /*
             * =========================
             * yyyy-MM-dd HH:mm:ss
             * =========================
             *
             * Ví dụ:
             * 2026-10-05 14:30:25
             */
            if (value.matches(
                    "\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}"
            )) {

                LocalDateTime from =
                        LocalDateTime.parse(
                                value,
                                DateTimeFormatter.ofPattern(
                                        "yyyy-MM-dd HH:mm:ss"
                                )
                        );

                LocalDateTime to =
                        from.withNano(
                                999_999_999
                        );

                return new LocalDateTimeRange(
                        from,
                        to
                );
            }

        } catch (DateTimeParseException |
                 NumberFormatException ignored) {

            return null;
        }

        return null;
    }

    /*
     * Object chứa khoảng thời gian tìm kiếm.
     */
    private record LocalDateTimeRange(
            LocalDateTime from,
            LocalDateTime to
    ) {
    }
}
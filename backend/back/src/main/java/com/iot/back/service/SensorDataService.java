package com.iot.back.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.iot.back.entity.Data;
import com.iot.back.entity.Sensor.SensorType;
import com.iot.back.repository.DataRepository;

@Service
public class SensorDataService {

    private final DataRepository sensorDataRepository;

    /*
     * Sai số khi tìm giá trị Float.
     *
     * Ví dụ nhập:
     *
     * 25.1
     *
     * Backend sẽ tìm:
     *
     * 25.0999 <= value <= 25.1001
     *
     * Như vậy sẽ không bị lỗi do sai số Float.
     */
    private static final float VALUE_TOLERANCE = 0.0001f;

    public SensorDataService(
            DataRepository sensorDataRepository
    ) {
        this.sensorDataRepository =
                sensorDataRepository;
    }

    public Page<Data> getSensorData(
            SensorType type,
            Float value,
            String timeStr,
            Pageable pageable
    ) {

        /*
         * Tạo khoảng tìm kiếm cho value.
         *
         * Ví dụ:
         *
         * value = 25.1
         *
         * minValue = 25.0999
         * maxValue = 25.1001
         */
        Float minValue = null;
        Float maxValue = null;

        if (value != null) {
            minValue =
                    value - VALUE_TOLERANCE;

            maxValue =
                    value + VALUE_TOLERANCE;
        }

        /*
         * Không có bộ lọc thời gian
         */
        if (
                timeStr == null ||
                timeStr.isBlank()
        ) {

            // Không có type và không có value
            if (
                    type == null &&
                    value == null
            ) {
                return sensorDataRepository
                        .findAll(pageable);
            }

            // Chỉ có type
            if (
                    type != null &&
                    value == null
            ) {
                return sensorDataRepository
                        .findBySensor_Type(
                                type,
                                pageable
                        );
            }

            // Chỉ có value
            if (type == null) {
                return sensorDataRepository
                        .findByValueBetween(
                                minValue,
                                maxValue,
                                pageable
                        );
            }

            // Có type + value
            return sensorDataRepository
                    .findBySensor_TypeAndValueBetween(
                            type,
                            minValue,
                            maxValue,
                            pageable
                    );
        }

        /*
         * Có bộ lọc thời gian
         */

        String cleanTime =
                timeStr
                        .trim()
                        .replace(
                                "T",
                                " "
                        );

        LocalDateTime startTime;
        LocalDateTime endTime;

        try {

            // YYYY
            if (
                    cleanTime.matches(
                            "^\\d{4}$"
                    )
            ) {

                int year =
                        Integer.parseInt(
                                cleanTime
                        );

                startTime =
                        LocalDate
                                .of(
                                        year,
                                        1,
                                        1
                                )
                                .atStartOfDay();

                endTime =
                        startTime
                                .plusYears(1)
                                .minusNanos(1);

            // YYYY-MM
            } else if (
                    cleanTime.matches(
                            "^\\d{4}-\\d{2}$"
                    )
            ) {

                YearMonth yearMonth =
                        YearMonth.parse(
                                cleanTime,
                                DateTimeFormatter
                                        .ofPattern(
                                                "yyyy-MM"
                                        )
                        );

                startTime =
                        yearMonth
                                .atDay(1)
                                .atStartOfDay();

                endTime =
                        startTime
                                .plusMonths(1)
                                .minusNanos(1);

            // YYYY-MM-DD
            } else if (
                    cleanTime.matches(
                            "^\\d{4}-\\d{2}-\\d{2}$"
                    )
            ) {

                LocalDate date =
                        LocalDate.parse(
                                cleanTime
                        );

                startTime =
                        date.atStartOfDay();

                endTime =
                        startTime
                                .plusDays(1)
                                .minusNanos(1);

            // YYYY-MM-DD HH
            } else if (
                    cleanTime.matches(
                            "^\\d{4}-\\d{2}-\\d{2} \\d{2}$"
                    )
            ) {

                DateTimeFormatter formatter =
                        DateTimeFormatter
                                .ofPattern(
                                        "yyyy-MM-dd HH"
                                );

                startTime =
                        LocalDateTime.parse(
                                cleanTime,
                                formatter
                        );

                endTime =
                        startTime
                                .plusHours(1)
                                .minusNanos(1);

            // YYYY-MM-DD HH:mm
            } else if (
                    cleanTime.matches(
                            "^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$"
                    )
            ) {

                DateTimeFormatter formatter =
                        DateTimeFormatter
                                .ofPattern(
                                        "yyyy-MM-dd HH:mm"
                                );

                startTime =
                        LocalDateTime.parse(
                                cleanTime,
                                formatter
                        );

                endTime =
                        startTime
                                .plusMinutes(1)
                                .minusNanos(1);

            // YYYY-MM-DD HH:mm:ss
            } else if (
                    cleanTime.matches(
                            "^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$"
                    )
            ) {

                DateTimeFormatter formatter =
                        DateTimeFormatter
                                .ofPattern(
                                        "yyyy-MM-dd HH:mm:ss"
                                );

                startTime =
                        LocalDateTime.parse(
                                cleanTime,
                                formatter
                        );

                endTime =
                        startTime
                                .plusSeconds(1)
                                .minusNanos(1);

            } else {

                /*
                 * Time không hợp lệ:
                 * bỏ qua filter time,
                 * nhưng vẫn giữ type/value.
                 */

                if (
                        type == null &&
                        value == null
                ) {
                    return sensorDataRepository
                            .findAll(pageable);
                }

                if (
                        type != null &&
                        value == null
                ) {
                    return sensorDataRepository
                            .findBySensor_Type(
                                    type,
                                    pageable
                            );
                }

                if (type == null) {
                    return sensorDataRepository
                            .findByValueBetween(
                                    minValue,
                                    maxValue,
                                    pageable
                            );
                }

                return sensorDataRepository
                        .findBySensor_TypeAndValueBetween(
                                type,
                                minValue,
                                maxValue,
                                pageable
                        );
            }

        } catch (
                DateTimeParseException |
                NumberFormatException e
        ) {

            /*
             * Time không parse được:
             * bỏ qua filter time,
             * nhưng vẫn giữ type/value.
             */

            if (
                    type == null &&
                    value == null
            ) {
                return sensorDataRepository
                        .findAll(pageable);
            }

            if (
                    type != null &&
                    value == null
            ) {
                return sensorDataRepository
                        .findBySensor_Type(
                                type,
                                pageable
                        );
            }

            if (type == null) {
                return sensorDataRepository
                        .findByValueBetween(
                                minValue,
                                maxValue,
                                pageable
                        );
            }

            return sensorDataRepository
                    .findBySensor_TypeAndValueBetween(
                            type,
                            minValue,
                            maxValue,
                            pageable
                    );
        }

        /*
         * Time hợp lệ.
         */

        // Chỉ có time
        if (
                type == null &&
                value == null
        ) {
            return sensorDataRepository
                    .findByTimeBetween(
                            startTime,
                            endTime,
                            pageable
                    );
        }

        // Type + time
        if (
                type != null &&
                value == null
        ) {
            return sensorDataRepository
                    .findBySensor_TypeAndTimeBetween(
                            type,
                            startTime,
                            endTime,
                            pageable
                    );
        }

        // Value + time
        if (type == null) {

            /*
             * Không dùng:
             *
             * findByValueAndTimeBetween()
             *
             * vì value là Float và có thể
             * gặp sai số.
             */
            return sensorDataRepository
                    .findByValueBetweenAndTimeBetween(
                            minValue,
                            maxValue,
                            startTime,
                            endTime,
                            pageable
                    );
        }

        // Type + value + time
        return sensorDataRepository
                .findBySensor_TypeAndValueBetweenAndTimeBetween(
                        type,
                        minValue,
                        maxValue,
                        startTime,
                        endTime,
                        pageable
                );
    }
}
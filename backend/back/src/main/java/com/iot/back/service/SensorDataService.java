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

    public SensorDataService(DataRepository sensorDataRepository) {
        this.sensorDataRepository = sensorDataRepository;
    }

    public Page<Data> getSensorData(
            SensorType type,
            Float value,
            String timeStr,
            Pageable pageable) {

        /*
         * Không có bộ lọc thời gian
         */
        if (timeStr == null || timeStr.isBlank()) {

            // Không có type và không có value
            if (type == null && value == null) {
                return sensorDataRepository.findAll(pageable);
            }

            // Chỉ có type
            if (type != null && value == null) {
                return sensorDataRepository.findBySensor_Type(
                        type,
                        pageable
                );
            }

            // Chỉ có value
            if (type == null) {
                return sensorDataRepository.findByValue(
                        value,
                        pageable
                );
            }

            // Có type + value
            return sensorDataRepository.findBySensor_TypeAndValue(
                    type,
                    value,
                    pageable
            );
        }

        /*
         * Có bộ lọc thời gian
         */

        String cleanTime = timeStr.trim().replace("T", " ");

        LocalDateTime startTime;
        LocalDateTime endTime;

        try {

            // YYYY
            if (cleanTime.matches("^\\d{4}$")) {

                int year = Integer.parseInt(cleanTime);

                startTime = LocalDate
                        .of(year, 1, 1)
                        .atStartOfDay();

                endTime = startTime
                        .plusYears(1)
                        .minusNanos(1);

            // YYYY-MM
            } else if (cleanTime.matches("^\\d{4}-\\d{2}$")) {

                YearMonth yearMonth = YearMonth.parse(
                        cleanTime,
                        DateTimeFormatter.ofPattern("yyyy-MM")
                );

                startTime = yearMonth
                        .atDay(1)
                        .atStartOfDay();

                endTime = startTime
                        .plusMonths(1)
                        .minusNanos(1);

            // YYYY-MM-DD
            } else if (cleanTime.matches("^\\d{4}-\\d{2}-\\d{2}$")) {

                LocalDate date = LocalDate.parse(cleanTime);

                startTime = date.atStartOfDay();

                endTime = startTime
                        .plusDays(1)
                        .minusNanos(1);

            // YYYY-MM-DD HH
            } else if (cleanTime.matches("^\\d{4}-\\d{2}-\\d{2} \\d{2}$")) {

                DateTimeFormatter formatter =
                        DateTimeFormatter.ofPattern("yyyy-MM-dd HH");

                startTime = LocalDateTime.parse(
                        cleanTime,
                        formatter
                );

                endTime = startTime
                        .plusHours(1)
                        .minusNanos(1);

            // YYYY-MM-DD HH:mm
            } else if (cleanTime.matches(
                    "^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$")) {

                DateTimeFormatter formatter =
                        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

                startTime = LocalDateTime.parse(
                        cleanTime,
                        formatter
                );

                endTime = startTime
                        .plusMinutes(1)
                        .minusNanos(1);

            // YYYY-MM-DD HH:mm:ss
            } else if (cleanTime.matches(
                    "^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$")) {

                DateTimeFormatter formatter =
                        DateTimeFormatter.ofPattern(
                                "yyyy-MM-dd HH:mm:ss"
                        );

                startTime = LocalDateTime.parse(
                        cleanTime,
                        formatter
                );

                endTime = startTime
                        .plusSeconds(1)
                        .minusNanos(1);

            } else {

                /*
                 * Thời gian không đúng định dạng.
                 * Giữ nguyên hành vi cũ: bỏ qua filter time,
                 * nhưng vẫn áp dụng type/value.
                 */

                if (type == null && value == null) {
                    return sensorDataRepository.findAll(pageable);
                }

                if (type != null && value == null) {
                    return sensorDataRepository.findBySensor_Type(
                            type,
                            pageable
                    );
                }

                if (type == null) {
                    return sensorDataRepository.findByValue(
                            value,
                            pageable
                    );
                }

                return sensorDataRepository.findBySensor_TypeAndValue(
                        type,
                        value,
                        pageable
                );
            }

        } catch (DateTimeParseException | NumberFormatException e) {

            /*
             * Thời gian không parse được.
             * Giữ nguyên hành vi cũ: bỏ qua filter time,
             * nhưng vẫn áp dụng type/value.
             */

            if (type == null && value == null) {
                return sensorDataRepository.findAll(pageable);
            }

            if (type != null && value == null) {
                return sensorDataRepository.findBySensor_Type(
                        type,
                        pageable
                );
            }

            if (type == null) {
                return sensorDataRepository.findByValue(
                        value,
                        pageable
                );
            }

            return sensorDataRepository.findBySensor_TypeAndValue(
                    type,
                    value,
                    pageable
            );
        }

        /*
         * Đến đây nghĩa là time hợp lệ.
         *
         * Có 4 trường hợp:
         *
         * 1. time
         * 2. type + time
         * 3. value + time
         * 4. type + value + time
         */

        if (type == null && value == null) {

            return sensorDataRepository.findByTimeBetween(
                    startTime,
                    endTime,
                    pageable
            );
        }

        if (type != null && value == null) {

            return sensorDataRepository.findBySensor_TypeAndTimeBetween(
                    type,
                    startTime,
                    endTime,
                    pageable
            );
        }

        if (type == null) {

            return sensorDataRepository.findByValueAndTimeBetween(
                    value,
                    startTime,
                    endTime,
                    pageable
            );
        }

        return sensorDataRepository
                .findBySensor_TypeAndValueAndTimeBetween(
                        type,
                        value,
                        startTime,
                        endTime,
                        pageable
                );
    }
}
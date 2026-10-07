package com.iot.back.repository;

import java.time.LocalDateTime;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.iot.back.entity.Data;
import com.iot.back.entity.Sensor.SensorType;

public interface DataRepository extends JpaRepository<Data, Long> {

    Page<Data> findBySensor_Type(
            SensorType type,
            Pageable pageable
    );

    Page<Data> findByTimeBetween(
            LocalDateTime start,
            LocalDateTime end,
            Pageable pageable
    );

    Page<Data> findBySensor_TypeAndTimeBetween(
            SensorType type,
            LocalDateTime start,
            LocalDateTime end,
            Pageable pageable
    );

    /*
     * Tìm giá trị trong khoảng sai số.
     *
     * Ví dụ:
     * value = 25.1
     * min   = 25.0999
     * max   = 25.1001
     */
    Page<Data> findByValueBetween(
            Float minValue,
            Float maxValue,
            Pageable pageable
    );

    /*
     * Tìm theo loại sensor + khoảng giá trị.
     */
    Page<Data> findBySensor_TypeAndValueBetween(
            SensorType type,
            Float minValue,
            Float maxValue,
            Pageable pageable
    );

    Page<Data> findByValueAndTimeBetween(
            Float value,
            LocalDateTime start,
            LocalDateTime end,
            Pageable pageable
    );

    Page<Data> findBySensor_TypeAndValueAndTimeBetween(
            SensorType type,
            Float value,
            LocalDateTime start,
            LocalDateTime end,
            Pageable pageable
    );
}
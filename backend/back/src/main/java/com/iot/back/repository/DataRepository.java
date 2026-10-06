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

    // Search theo giá trị cảm biến
    Page<Data> findByValue(
            Float value,
            Pageable pageable
    );

    // Search theo loại cảm biến + giá trị
    Page<Data> findBySensor_TypeAndValue(
            SensorType type,
            Float value,
            Pageable pageable
    );

    // Search theo giá trị + thời gian
    Page<Data> findByValueAndTimeBetween(
            Float value,
            LocalDateTime start,
            LocalDateTime end,
            Pageable pageable
    );

    // Search theo loại + giá trị + thời gian
    Page<Data> findBySensor_TypeAndValueAndTimeBetween(
            SensorType type,
            Float value,
            LocalDateTime start,
            LocalDateTime end,
            Pageable pageable
    );
}
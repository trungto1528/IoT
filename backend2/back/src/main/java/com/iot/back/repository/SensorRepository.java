package com.iot.back.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.iot.back.entity.Sensor;

public interface SensorRepository extends JpaRepository<Sensor, Integer> {
    Optional<Sensor> findByType(Sensor.SensorType type);
}
package com.iot.back.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "sensors")
public class Sensor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer ssid;

    @Column(length = 255)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "ENUM('temp', 'humid', 'light')")
    private SensorType type;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public enum SensorType {
        temp, humid, light
    }
}

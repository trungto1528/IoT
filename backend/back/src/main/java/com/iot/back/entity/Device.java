package com.iot.back.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@NoArgsConstructor
@Getter
@Setter
@Table(name = "devices")
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "name", nullable = false)
    private String name; // Ví dụ: "Đèn phòng khách", "LED 1"

    @Column(name = "device_number", unique = true)
    private Integer deviceNumber; // Số hiệu nhận diện (1, 2, 3, 4...)

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public Device(String name, Integer deviceNumber, String status) {
        this.name = name;
        this.deviceNumber = deviceNumber;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
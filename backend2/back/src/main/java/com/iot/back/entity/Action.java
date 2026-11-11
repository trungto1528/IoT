package com.iot.back.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@NoArgsConstructor
@Getter
@Setter
@Table(name = "actions")
public class Action {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "uid")
    private Integer uid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id")
    private Device device;

    @Column(name = "action")
    private String action; // "Bật" hoặc "Tắt"

    @Column(name = "status")
    private String status; // "Loading", "Thành công", "Timeout"

    @Column(name = "time")
    private LocalDateTime time;

    public Action(Integer uid, Device device, String action, String status) {
        this.uid = uid;
        this.device = device;
        this.action = action;
        this.status = status;
        this.time = LocalDateTime.now().withNano(0);
    }
}
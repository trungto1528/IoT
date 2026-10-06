package com.iot.back.dto;

import java.time.LocalDateTime;

import com.iot.back.entity.Data;

public record SensorDataResponse(Integer id, String type, Float value, LocalDateTime time) {

    public static SensorDataResponse from(Data data) {
        return new SensorDataResponse(
                data.getId(),
                data.getSensor().getType().name(),
                data.getValue(),
                data.getTime()
        );
    }
}

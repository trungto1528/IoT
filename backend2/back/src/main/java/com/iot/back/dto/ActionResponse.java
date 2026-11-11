package com.iot.back.dto;

import java.time.LocalDateTime;

import com.iot.back.entity.Action;

public record ActionResponse(
        Integer id,
        Integer uid,
        String userName,
        DeviceResponse device,
        String action,
        String status,
        LocalDateTime time
) {

    public static ActionResponse from(Action action, String userName) {
        DeviceResponse deviceResponse = null;

        if (action.getDevice() != null) {
            deviceResponse = new DeviceResponse(
                    action.getDevice().getName(),
                    action.getDevice().getDeviceNumber()
            );
        }

        return new ActionResponse(
                action.getId(),
                action.getUid(),
                userName,
                deviceResponse,
                action.getAction(),
                action.getStatus(),
                action.getTime()
        );
    }

    public record DeviceResponse(
            String name,
            Integer deviceNumber
    ) {
    }
}
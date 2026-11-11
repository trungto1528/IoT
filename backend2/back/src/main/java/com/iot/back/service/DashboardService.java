package com.iot.back.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final MqttResponseBridgeService bridgeService;

    public Map<String, Boolean> getLedStatus() {
        String statusStr;

        try {
            statusStr = bridgeService.fetchCurrentLedStatus();
        } catch (Exception e) {
            System.err.println(
                    "[DASHBOARD] Không lấy được trạng thái LED: " + e.getMessage());
            statusStr = bridgeService.getCurrentLedStatus();
        }

        if (statusStr == null || !statusStr.matches("[01]{7}")) {
            statusStr = "0000000";
        }

        return Map.of(
                "led1", statusStr.charAt(0) == '1',
                "led2", statusStr.charAt(1) == '1',
                "led3", statusStr.charAt(2) == '1',
                "led4", statusStr.charAt(3) == '1',
                "led5", statusStr.charAt(4) == '1',
                "led6", statusStr.charAt(5) == '1',
                "led7", statusStr.charAt(6) == '1');
    }

    public Map<String, Object> controlLed(Map<String, Object> body) throws Exception {
        if (!(body.get("targetNumber") instanceof Number)
                || !(body.get("actionVal") instanceof Number)) {
            throw new IllegalArgumentException(
                    "targetNumber và actionVal phải là số");
        }

        Integer targetNumber =
                ((Number) body.get("targetNumber")).intValue();

        Integer actionVal =
                ((Number) body.get("actionVal")).intValue();

        Integer uid = body.get("uid") instanceof Number
                ? ((Number) body.get("uid")).intValue()
                : 1;

        if (targetNumber < 1 || targetNumber > 4) {
            throw new IllegalArgumentException(
                    "API thủ công chỉ điều khiển LED 1 đến LED 4");
        }

        if (actionVal != 0 && actionVal != 1) {
            throw new IllegalArgumentException(
                    "actionVal phải là 0 hoặc 1");
        }

        String actionStr = actionVal == 1 ? "Bật" : "Tắt";
        String commandJson =
                "{\"" + targetNumber + "\":" + actionVal + "}";

        String newStatusStr = bridgeService.toggleLedWithActionLog(
                uid,
                targetNumber,
                actionStr,
                commandJson);

        Map<String, Object> response = new HashMap<>();
        response.put("ledStatus", newStatusStr);

        return response;
    }
}
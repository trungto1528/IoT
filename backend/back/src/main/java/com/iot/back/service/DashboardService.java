package com.iot.back.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
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
                        statusStr = bridgeService.getCurrentLedStatus();
                }

                boolean led1 = statusStr.length() > 0
                                && statusStr.charAt(0) == '1';

                boolean led2 = statusStr.length() > 1
                                && statusStr.charAt(1) == '1';

                boolean led3 = statusStr.length() > 2
                                && statusStr.charAt(2) == '1';

                boolean led4 = statusStr.length() > 3
                                && statusStr.charAt(3) == '1';

                return Map.of(
                                "led1", led1,
                                "led2", led2,
                                "led3", led3,
                                "led4", led4);
        }

        public Map<String, Object> controlLed(
                        Map<String, Object> body) throws Exception {

                Integer targetNumber = ((Number) body.get("targetNumber")).intValue();

                Integer actionVal = ((Number) body.get("actionVal")).intValue();

                Integer uid = body.containsKey("uid")
                                ? ((Number) body.get("uid")).intValue()
                                : 1;

                // Kiểm tra LED
                if (targetNumber < 1 || targetNumber > 4) {
                        throw new IllegalArgumentException(
                                        "targetNumber phải từ 1 đến 4");
                }

                // Kiểm tra trạng thái
                if (actionVal != 0 && actionVal != 1) {
                        throw new IllegalArgumentException(
                                        "actionVal phải là 0 hoặc 1");
                }

                String actionStr = (actionVal == 1) ? "Bật" : "Tắt";

                /*
                 * Chỉ gửi LED cần thay đổi.
                 *
                 * Ví dụ:
                 * LED1 bật -> {"1":1}
                 * LED2 tắt -> {"2":0}
                 */
                String commandJson = "{\"" + targetNumber + "\":" + actionVal + "}";
                System.out.println(commandJson);
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
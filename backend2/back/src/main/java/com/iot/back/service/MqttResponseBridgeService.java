package com.iot.back.service;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iot.back.entity.Action;
import com.iot.back.entity.Device;
import com.iot.back.repository.ActionRepository;
import com.iot.back.repository.DeviceRepository;

@Service
public class MqttResponseBridgeService {

    private static final long RESPONSE_TIMEOUT_SECONDS = 10;

    private final MqttPublisherService mqttPublisherService;
    private final ActionRepository actionRepository;
    private final DeviceRepository deviceRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final ConcurrentHashMap<String, CompletableFuture<String>> pendingRequests =
            new ConcurrentHashMap<>();

    private volatile String currentLedStatus = "0000000";

    public MqttResponseBridgeService(
            ActionRepository actionRepository,
            DeviceRepository deviceRepository,
            MqttPublisherService mqttPublisherService) {
        this.actionRepository = actionRepository;
        this.deviceRepository = deviceRepository;
        this.mqttPublisherService = mqttPublisherService;
    }

    public String getCurrentLedStatus() {
        return currentLedStatus;
    }

    public String fetchCurrentLedStatus() throws Exception {
        String requestId = UUID.randomUUID().toString();
        CompletableFuture<String> future = new CompletableFuture<>();

        pendingRequests.put(requestId, future);

        try {
            System.out.println("[LED STATUS] requestId=" + requestId);

            mqttPublisherService.requestLedStatus(requestId);

            String status = future.get(
                    RESPONSE_TIMEOUT_SECONDS,
                    TimeUnit.SECONDS);

            currentLedStatus = status;
            return status;

        } catch (TimeoutException e) {
            throw new TimeoutException(
                    "Không nhận được trạng thái LED từ ESP32 sau "
                            + RESPONSE_TIMEOUT_SECONDS + " giây");
        } finally {
            pendingRequests.remove(requestId, future);
        }
    }

    public String toggleLedWithActionLog(
            Integer uid,
            Integer targetNumber,
            String actionType,
            String command) throws Exception {

        if (targetNumber == null || targetNumber < 1 || targetNumber > 4) {
            throw new IllegalArgumentException(
                    "Điều khiển thủ công chỉ hỗ trợ LED 1 đến LED 4");
        }

        Device device = deviceRepository
                .findByDeviceNumber(targetNumber)
                .orElseThrow(() -> new RuntimeException(
                        "Không tìm thấy thiết bị: " + targetNumber));

        Action actionLog = actionRepository.save(
                new Action(uid, device, actionType, "Loading"));

        String requestId = UUID.randomUUID().toString();
        CompletableFuture<String> future = new CompletableFuture<>();

        pendingRequests.put(requestId, future);

        try {
            JsonNode originalCommand = objectMapper.readTree(command);
            ObjectNode commandWithId = objectMapper.createObjectNode();

            commandWithId.setAll((ObjectNode) originalCommand);
            commandWithId.put("requestId", requestId);

            String payload = objectMapper.writeValueAsString(commandWithId);

            System.out.println(
                    "[LED MANUAL] requestId=" + requestId
                            + " payload=" + payload);

            mqttPublisherService.sendManualControl(payload);

            String response = future.get(
                    RESPONSE_TIMEOUT_SECONDS,
                    TimeUnit.SECONDS);

            currentLedStatus = response;

            actionLog.setStatus("Thành công");
            actionLog.setTime(LocalDateTime.now().withNano(0));
            actionRepository.save(actionLog);

            return response;

        } catch (TimeoutException e) {
            actionLog.setStatus("Timeout");
            actionLog.setTime(LocalDateTime.now());
            actionRepository.save(actionLog);

            throw new TimeoutException(
                    "Thiết bị không phản hồi sau "
                            + RESPONSE_TIMEOUT_SECONDS + " giây");

        } catch (Exception e) {
            actionLog.setStatus("Thất bại");
            actionLog.setTime(LocalDateTime.now());
            actionRepository.save(actionLog);
            throw e;

        } finally {
            pendingRequests.remove(requestId, future);
        }
    }

    public void onResponseReceived(String payload) {
        try {
            JsonNode response = objectMapper.readTree(payload);

            String requestId = response.has("requestId")
                    ? response.get("requestId").asText()
                    : null;

            String status = response.has("status")
                    ? response.get("status").asText()
                    : null;

            if (requestId == null || requestId.isBlank()
                    || status == null || status.length() != 7) {
                System.err.println("[RESPONSE] Response không hợp lệ: " + payload);
                return;
            }

            if (!status.matches("[01]{7}")) {
                System.err.println("[RESPONSE] Trạng thái LED không hợp lệ: " + status);
                return;
            }

            CompletableFuture<String> future = pendingRequests.get(requestId);

            if (future == null) {
                System.out.println(
                        "[RESPONSE] Không có request đang chờ: " + requestId);
                return;
            }

            currentLedStatus = status;
            boolean completed = future.complete(status);

            System.out.println(
                    "[RESPONSE] requestId=" + requestId
                            + " status=" + status
                            + " completed=" + completed);

        } catch (Exception e) {
            System.err.println(
                    "[RESPONSE] Không thể parse response: "
                            + payload + " | " + e.getMessage());
        }
    }
}
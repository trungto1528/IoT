package com.iot.back.service;

import java.time.LocalDateTime;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.locks.ReentrantLock;

import org.springframework.stereotype.Service;

import com.iot.back.entity.Action;
import com.iot.back.entity.Device;
import com.iot.back.repository.ActionRepository;
import com.iot.back.repository.DeviceRepository;

@Service
public class MqttResponseBridgeService {

        private final MqttPublisherService mqttPublisherService;
        private final ActionRepository actionRepository;
        private final DeviceRepository deviceRepository;
        private final ReentrantLock ledLock = new ReentrantLock();
        private final ConcurrentHashMap<String, CompletableFuture<String>> pendingRequests = new ConcurrentHashMap<>();

        private volatile String currentLedStatus = "0000000";

        public MqttResponseBridgeService(ActionRepository actionRepository, DeviceRepository deviceRepository,
                        MqttPublisherService mqttPublisherService) {
                this.actionRepository = actionRepository;
                this.deviceRepository = deviceRepository;
                this.mqttPublisherService = mqttPublisherService;
        }

        public String getCurrentLedStatus() {
                return currentLedStatus;
        }

        /**
         * Gửi lệnh lấy trạng thái hiện tại của LED.
         */
        public String fetchCurrentLedStatus() throws Exception {

                CompletableFuture<String> future;

                ledLock.lock();
                try {
                        if (pendingRequests.containsKey("REQ_LED")) {
                                throw new IllegalStateException(
                                                "Đang xử lý yêu cầu LED khác, vui lòng thử lại sau");
                        }

                        future = new CompletableFuture<>();
                        pendingRequests.put("REQ_LED", future);

                        System.out.println("[LED] Future created: " + future);
                        System.out.println("[LED] Sending status...");
                } finally {
                        ledLock.unlock();
                }

                try {

                        mqttPublisherService.sendToMqtt(
                                        "control",
                                        "status");

                        System.out.println("[LED] Waiting response...");

                        String responsePayload = future.get(10, TimeUnit.SECONDS);

                        System.out.println(
                                        "[LED] Future returned: [" + responsePayload + "]");

                        return responsePayload;

                } catch (TimeoutException e) {

                        System.out.println("[LED] TIMEOUT 10 SECONDS");
                        System.out.println(
                                        "[LED] Future at timeout: " + future);
                        System.out.println(
                                        "[LED] Future done: " + future.isDone());

                        throw e;

                } finally {

                        ledLock.lock();
                        try {
                                pendingRequests.remove("REQ_LED", future);

                                System.out.println(
                                                "[LED] Future removed: " + future);
                        } finally {
                                ledLock.unlock();
                        }
                }
        }

        /**
         * Gửi lệnh điều khiển LED và ghi log.
         *
         * command có thể là:
         *
         * {"1":1}
         * {"2":0}
         * {"1":1,"3":0}
         */
        public String toggleLedWithActionLog(
                        Integer uid,
                        Integer targetNumber,
                        String actionType,
                        String command) throws Exception {

                CompletableFuture<String> future;
                Device device;
                Action actionLog;

                // ============================================
                // 1. Thao tác DB + pendingRequests (giữ lock ngắn)
                // ============================================
                ledLock.lock();
                try {

                        if (pendingRequests.containsKey("REQ_LED")) {
                                throw new IllegalStateException(
                                                "Đang xử lý yêu cầu LED khác, vui lòng thử lại sau");
                        }

                        device = deviceRepository
                                        .findByDeviceNumber(targetNumber)
                                        .orElseThrow(() -> new RuntimeException(
                                                        "Không tìm thấy thiết bị: "
                                                                        + targetNumber));

                        actionLog = actionRepository.save(
                                        new Action(
                                                        uid,
                                                        device,
                                                        actionType,
                                                        "Loading"));

                        future = new CompletableFuture<>();
                        pendingRequests.put("REQ_LED", future);

                } finally {
                        ledLock.unlock();
                }

                try {

                        // ========================================
                        // 2. Gửi command (không giữ lock)
                        // ========================================
                        mqttPublisherService.sendToMqtt("control", command);

                        // ========================================
                        // 3. Chờ ESP32 response (không giữ lock)
                        // ========================================
                        String responsePayload = future.get(20, TimeUnit.SECONDS);

                        // ========================================
                        // 4. Thành công -> cập nhật action log
                        // ========================================
                        ledLock.lock();
                        try {
                                actionLog.setStatus("Thành công");
                                actionLog.setTime(LocalDateTime.now().withNano(0));
                                actionRepository.save(actionLog);
                        } finally {
                                ledLock.unlock();
                        }

                        return responsePayload;

                } catch (TimeoutException e) {

                        // ========================================
                        // 5. Timeout -> cập nhật action log
                        // ========================================
                        ledLock.lock();
                        try {
                                actionLog.setStatus("Timeout");
                                actionLog.setTime(LocalDateTime.now());
                                actionRepository.save(actionLog);
                        } finally {
                                ledLock.unlock();
                        }

                        throw new TimeoutException(
                                        "Thao tác thất bại: "
                                                        + "Thiết bị không phản hồi "
                                                        + "(Timeout 10s)");

                } finally {

                        // ========================================
                        // 6. Dọn dẹp pendingRequests
                        // ========================================
                        if (future != null) {
                                ledLock.lock();
                                try {
                                        pendingRequests.remove("REQ_LED", future);
                                } finally {
                                        ledLock.unlock();
                                }
                        }
                }
        }

        /**
         * Được gọi khi nhận message từ topic response.
         */
        public void onResponseReceived(String payload) {

                System.out.println("========== RESPONSE RECEIVED ==========");
                System.out.println("[RESPONSE] payload = [" + payload + "]");

                CompletableFuture<String> future = pendingRequests.get("REQ_LED");

                System.out.println("[RESPONSE] future = " + future);

                if (future == null) {

                        System.out.println(
                                        "[RESPONSE] KHONG TIM THAY FUTURE");

                        System.out.println(
                                        "[RESPONSE] pendingRequests = "
                                                        + pendingRequests);

                        System.out.println("======================================");

                        return;
                }

                System.out.println(
                                "[RESPONSE] future.isDone = "
                                                + future.isDone());

                boolean result = future.complete(payload.trim());

                System.out.println(
                                "[RESPONSE] future.complete() = "
                                                + result);

                System.out.println(
                                "[RESPONSE] future.isDone = "
                                                + future.isDone());

                System.out.println("======================================");
        }
}
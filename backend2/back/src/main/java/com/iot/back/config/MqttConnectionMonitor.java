package com.iot.back.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.integration.mqtt.core.Mqttv3ClientManager;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class MqttConnectionMonitor {

    private static final Logger log = LoggerFactory.getLogger(MqttConnectionMonitor.class);

    private final Mqttv3ClientManager clientManager;

    public MqttConnectionMonitor(Mqttv3ClientManager clientManager) {
        this.clientManager = clientManager;
    }

    /**
     * Paho chỉ tự reconnect sau khi đã kết nối thành công ít nhất một lần.
     * Nếu lần kết nối đầu tiên thất bại (broker chưa chạy), tác vụ này sẽ
     * đóng client cũ và thử kết nối lại cho đến khi thành công.
     */
    @Scheduled(
            initialDelayString = "${mqtt.reconnect.initial-delay-ms:5000}",
            fixedDelayString = "${mqtt.reconnect.interval-ms:5000}")
    public synchronized void ensureConnected() {
        if (clientManager.isConnected()) {
            return;
        }

        log.warn("MQTT broker chưa kết nối được, đang thử kết nối lại...");

        try {
            clientManager.stop();
        } catch (Exception ex) {
            log.debug("Không thể dừng MQTT client trước khi kết nối lại", ex);
        }

        try {
            clientManager.start();
            if (clientManager.isConnected()) {
                log.info("Đã kết nối lại MQTT broker thành công");
            } else {
                log.warn("Kết nối lại MQTT broker thất bại, sẽ thử lại sau");
            }
        } catch (Exception ex) {
            log.warn("Kết nối lại MQTT broker thất bại: {}", ex.getMessage());
        }
    }
}

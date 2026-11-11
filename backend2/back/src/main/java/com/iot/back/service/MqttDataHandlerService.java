package com.iot.back.service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.iot.back.entity.Data;
import com.iot.back.entity.Sensor;
import com.iot.back.repository.DataRepository;
import com.iot.back.repository.SensorRepository;
import com.iot.back.service.MqttPublisherService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MqttDataHandlerService {
    
    private final SensorRepository sensorRepository;
    private final DataRepository dataRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final MqttPublisherService mqttPublisherService;

    private volatile boolean lastGasAlert = false;
    private volatile boolean lastSmokeAlert = false;
    private volatile boolean lastMotionAlert = false;

    private static final float ALERT_THRESHOLD = 50.0f;

    public void onMessageReceived(Float temp, Float humid, Float light, Long timestamp) {
        LocalDateTime recordTime;
        if (timestamp != null && timestamp > 0) {
            recordTime = LocalDateTime.ofInstant(Instant.ofEpochSecond(timestamp), ZoneId.systemDefault());
        } else {
            recordTime = LocalDateTime.now();
        }

        // 2. Lưu vào DB dùng chung mốc thời gian từ thiết bị
        saveSensorValue(Sensor.SensorType.temp, temp, recordTime);
        saveSensorValue(Sensor.SensorType.humid, humid, recordTime);
        saveSensorValue(Sensor.SensorType.light, light, recordTime);

        // 3. Broadcast qua STOMP WebSocket tới `/topic/dashboard`
        Map<String, Object> payload = new HashMap<>();
        payload.put("temp", temp);
        payload.put("humid", humid);
        payload.put("light", light);
        payload.put("timestamp", timestamp != null ? timestamp : Instant.now().getEpochSecond());

        messagingTemplate.convertAndSend("/topic/dashboard", (Object) payload);
    }

    public void onNewMessageReceived(Float gas, Float smoke, Float motion, Long timestamp) {
        LocalDateTime recordTime;
        if (timestamp != null && timestamp > 0) {
            recordTime = LocalDateTime.ofInstant(Instant.ofEpochSecond(timestamp), ZoneId.systemDefault());
        } else {
            recordTime = LocalDateTime.now();
        }

        saveSensorValue(Sensor.SensorType.gas, gas, recordTime);
        saveSensorValue(Sensor.SensorType.smoke, smoke, recordTime);
        saveSensorValue(Sensor.SensorType.motion, motion, recordTime);

        Map<String, Object> payload = new HashMap<>();
        payload.put("gas", gas);
        payload.put("smoke", smoke);
        payload.put("motion", motion);
        payload.put("timestamp", timestamp != null ? timestamp : Instant.now().getEpochSecond());

        messagingTemplate.convertAndSend("/topic/dashboard", (Object) payload);

        // 4. Tự động điều khiển đèn 5, 6, 7 qua MQTT khi vượt ngưỡng 50%
        // Chỉ gửi lệnh khi trạng thái thay đổi (rising/falling edge)
        handleLed5(gas);
        handleLed6(smoke);
        handleLed7(motion);
    }

    private void handleLed5(Float gas) {
        boolean alert = gas != null && gas > ALERT_THRESHOLD;
        if (alert != lastGasAlert) {
            lastGasAlert = alert;
            String command = "{\"5\":" + (alert ? 1 : 0) + "}";
            mqttPublisherService.sendToMqtt("control", command);
            System.out.println("[AUTO LED] gas=" + gas + " -> " + command);
        }
    }

    private void handleLed6(Float smoke) {
        boolean alert = smoke != null && smoke > ALERT_THRESHOLD;
        if (alert != lastSmokeAlert) {
            lastSmokeAlert = alert;
            String command = "{\"6\":" + (alert ? 1 : 0) + "}";
            mqttPublisherService.sendToMqtt("control", command);
            System.out.println("[AUTO LED] smoke=" + smoke + " -> " + command);
        }
    }

    private void handleLed7(Float motion) {
        boolean alert = motion != null && motion > ALERT_THRESHOLD;
        if (alert != lastMotionAlert) {
            lastMotionAlert = alert;
            String command = "{\"7\":" + (alert ? 1 : 0) + "}";
            mqttPublisherService.sendToMqtt("control", command);
            System.out.println("[AUTO LED] motion=" + motion + " -> " + command);
        }
    }

    private void saveSensorValue(Sensor.SensorType type, Float value, LocalDateTime timestamp) {
        Sensor sensor = sensorRepository.findByType(type).orElseGet(() -> 
            sensorRepository.save(Sensor.builder()
                    .name("Sensor " + type.name())
                    .type(type)
                    .createdAt(timestamp)
                    .build())
        );

        dataRepository.save(Data.builder()
                .sensor(sensor)
                .value(value)
                .time(timestamp)
                .build());
    }
}
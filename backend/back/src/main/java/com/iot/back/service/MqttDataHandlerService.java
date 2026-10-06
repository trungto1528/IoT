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

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MqttDataHandlerService {
    
    private final SensorRepository sensorRepository;
    private final DataRepository dataRepository;
    private final SimpMessagingTemplate messagingTemplate;
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
package com.iot.back.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Service;

@Service
public class MqttPublisherService {

    @Lazy
    @Autowired
    private MessageChannel mqttOutboundChannel;

    /**
     * Gửi chuỗi trạng thái xuống MQTT topic cụ thể
     * @param topic Tên topic (ví dụ: "control")
     * @param payload Dữ liệu gửi đi (ví dụ: "send_status" hoặc "1011")
     */
    public void sendToMqtt(String topic, String payload) {
        Message<String> message = MessageBuilder.withPayload(payload)
                .setHeader(MqttHeaders.TOPIC, topic)
                .build();
        mqttOutboundChannel.send(message);
    }
}
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

    public void sendToMqtt(String topic, String payload) {
        Message<String> message = MessageBuilder.withPayload(payload)
                .setHeader(MqttHeaders.TOPIC, topic)
                .build();

        mqttOutboundChannel.send(message);
    }

    public void sendManualControl(String payload) {
        sendToMqtt("control/manual", payload);
    }

    public void sendAutoControl(String payload) {
        sendToMqtt("control/auto", payload);
    }

    public void requestLedStatus(String requestId) {
        sendToMqtt("control/status", requestId);
    }
}
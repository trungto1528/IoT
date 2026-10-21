package com.iot.back.config;

import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.channel.DirectChannel;
import org.springframework.integration.mqtt.core.Mqttv3ClientManager;
import org.springframework.integration.mqtt.inbound.MqttPahoMessageDrivenChannelAdapter;
import org.springframework.integration.mqtt.outbound.MqttPahoMessageHandler;
import org.springframework.integration.mqtt.support.DefaultPahoMessageConverter;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;
import org.springframework.scheduling.annotation.EnableScheduling;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iot.back.service.MqttDataHandlerService;
import com.iot.back.service.MqttResponseBridgeService;

@Configuration
@EnableScheduling
public class MqttSubscriberConfig {

    // Khai báo tập trung URL của HiveMQ Cloud
    private static final String BROKER_URL = "tcp://localhost:5555";

    @Autowired
    private MqttDataHandlerService mqttDataHandlerService;

    @Autowired
    private MqttResponseBridgeService mqttResponseBridgeService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Bean
    public MessageChannel mqttInputChannel() {
        return new DirectChannel();
    }

    @Bean
    public MessageChannel mqttOutboundChannel() {
        return new DirectChannel();
    }

    @Bean
    public Mqttv3ClientManager mqttClientManager() {
        MqttConnectOptions options = new MqttConnectOptions();

        options.setServerURIs(new String[] { BROKER_URL });
        options.setUserName("toquangtrung");
        options.setPassword("b23dccn863".toCharArray());

        options.setAutomaticReconnect(true);
        options.setCleanSession(true);
        options.setConnectionTimeout(10);
        options.setKeepAliveInterval(30);

        Mqttv3ClientManager clientManager = new Mqttv3ClientManager(
                options,
                "spring-backend-client-" + System.currentTimeMillis());

        // Chờ tối đa 10 giây cho mỗi lần kết nối
        clientManager.setCompletionTimeout(10_000L);

        // Cho client manager khởi động trước adapter/handler
        clientManager.setPhase(-1);

        return clientManager;
    }

    @Bean
    @ServiceActivator(inputChannel = "mqttOutboundChannel")
    public MessageHandler mqttOutbound(Mqttv3ClientManager mqttClientManager) {
        MqttPahoMessageHandler messageHandler = new MqttPahoMessageHandler(mqttClientManager);
        messageHandler.setAsync(true);
        messageHandler.setDefaultTopic("control");
        return messageHandler;
    }

    @Bean
    public MqttPahoMessageDrivenChannelAdapter inbound(Mqttv3ClientManager mqttClientManager) {
        MqttPahoMessageDrivenChannelAdapter adapter = new MqttPahoMessageDrivenChannelAdapter(
                mqttClientManager,
                "sensor_data", "response");

        adapter.setCompletionTimeout(5000);
        adapter.setConverter(new DefaultPahoMessageConverter());
        adapter.setQos(1);
        adapter.setOutputChannel(mqttInputChannel());
        return adapter;
    }

    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handleMessage(Message<String> message) {

        String payload = message.getPayload();

        String topic = (String) message.getHeaders()
                .get(MqttHeaders.RECEIVED_TOPIC);

        System.out.println(
                "[MQTT RECEIVE] topic=[" + topic + "] payload=[" + payload + "]");

        if (topic == null) {
            return;
        }

        if ("response".equals(topic)) {

            mqttResponseBridgeService.onResponseReceived(payload);

            return;
        }

        // 2. Nếu tin nhắn từ topic "sensor_data" -> Xử lý dữ liệu cảm biến
        if ("sensor_data".equals(topic)) {
            try {
                JsonNode node = objectMapper.readTree(payload);

                if (node.has("temp") && node.has("humid") && node.has("light")) {
                    Float temp = (float) node.get("temp").asDouble();
                    Float humid = (float) node.get("humid").asDouble();
                    Float light = (float) node.get("light").asDouble();

                    Long timestamp = node.has("timestamp") ? node.get("timestamp").asLong() : null;

                    mqttDataHandlerService.onMessageReceived(temp, humid, light, timestamp);
                } else {
                    System.err.println("Payload thiếu thuộc tính (yêu cầu: temp, humid, light): " + payload);
                }

            } catch (Exception e) {
                System.err.println("Lỗi parse dữ liệu MQTT payload: " + payload + " | Error: " + e.getMessage());
            }
        }
    }
}

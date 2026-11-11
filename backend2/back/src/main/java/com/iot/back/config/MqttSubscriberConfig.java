
package com.iot.back.config;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.ThreadPoolExecutor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iot.back.service.MqttDataHandlerService;
import com.iot.back.service.MqttResponseBridgeService;

import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.channel.DirectChannel;
import org.springframework.integration.channel.ExecutorChannel;

import org.springframework.integration.mqtt.core.Mqttv3ClientManager;
import org.springframework.integration.mqtt.inbound.MqttPahoMessageDrivenChannelAdapter;
import org.springframework.integration.mqtt.outbound.MqttPahoMessageHandler;
import org.springframework.integration.mqtt.support.DefaultPahoMessageConverter;
import org.springframework.integration.mqtt.support.MqttHeaders;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;

import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class MqttSubscriberConfig {

    private static final Logger log =
            LoggerFactory.getLogger(MqttSubscriberConfig.class);

    private static final String BROKER_URL = "tcp://localhost:5555";

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Bean
    public ThreadPoolTaskExecutor mqttInboundExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("mqtt-inbound-");

        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(10);

        executor.setRejectedExecutionHandler(
                new ThreadPoolExecutor.AbortPolicy()
        );

        return executor;
    }

    @Bean
    public MessageChannel mqttInputChannel(
            ThreadPoolTaskExecutor mqttInboundExecutor
    ) {
        return new ExecutorChannel(mqttInboundExecutor);
    }

    @Bean
    public MessageChannel mqttOutboundChannel() {
        return new DirectChannel();
    }

    @Bean
    public Mqttv3ClientManager mqttClientManager() {
        MqttConnectOptions options = new MqttConnectOptions();

        String mqttUsername = "toquangtrung";
        String mqttPassword = "b23dccn863";

        if (mqttUsername == null || mqttUsername.isBlank()) {
            throw new IllegalStateException(
                    "Chưa cấu hình biến môi trường MQTT_USERNAME"
            );
        }

        if (mqttPassword == null || mqttPassword.isBlank()) {
            throw new IllegalStateException(
                    "Chưa cấu hình biến môi trường MQTT_PASSWORD"
            );
        }

        options.setServerURIs(new String[]{BROKER_URL});
        options.setUserName(mqttUsername);
        options.setPassword(mqttPassword.toCharArray());

        options.setAutomaticReconnect(true);
        options.setCleanSession(true);
        options.setConnectionTimeout(10);
        options.setKeepAliveInterval(30);

        Mqttv3ClientManager clientManager =
                new Mqttv3ClientManager(
                        options,
                        "spring-backend-client-" + System.currentTimeMillis()
                );

        clientManager.setCompletionTimeout(10_000L);
        clientManager.setPhase(-1);

        return clientManager;
    }

    @Bean
    @ServiceActivator(inputChannel = "mqttOutboundChannel")
    public MessageHandler mqttOutbound(
            Mqttv3ClientManager mqttClientManager
    ) {
        MqttPahoMessageHandler messageHandler =
                new MqttPahoMessageHandler(mqttClientManager);

        messageHandler.setAsync(true);
        messageHandler.setDefaultTopic("control");

        return messageHandler;
    }

    @Bean
    public MqttPahoMessageDrivenChannelAdapter inbound(
            Mqttv3ClientManager mqttClientManager,
            @Qualifier("mqttInputChannel") MessageChannel inputChannel
    ) {
        MqttPahoMessageDrivenChannelAdapter adapter =
                new MqttPahoMessageDrivenChannelAdapter(
                        mqttClientManager,
                        "sensor_data",
                        "response",
                        "new"
                );

        adapter.setCompletionTimeout(5000);
        adapter.setConverter(new DefaultPahoMessageConverter());
        adapter.setQos(1);

        adapter.setOutputChannel(inputChannel);

        return adapter;
    }

    @Bean
    @ServiceActivator(inputChannel = "mqttInputChannel")
    public MessageHandler mqttInboundHandler(
            ObjectProvider<MqttDataHandlerService> dataHandlerProvider,
            ObjectProvider<MqttResponseBridgeService> responseBridgeProvider
    ) {
        return message -> handleInboundMessage(
                message,
                dataHandlerProvider,
                responseBridgeProvider
        );
    }

    private void handleInboundMessage(
            Message<?> message,
            ObjectProvider<MqttDataHandlerService> dataHandlerProvider,
            ObjectProvider<MqttResponseBridgeService> responseBridgeProvider
    ) {
        String payload = getPayloadAsString(message);

        String topic = message.getHeaders().get(
                MqttHeaders.RECEIVED_TOPIC,
                String.class
        );

        if (topic == null) {
            log.warn("[MQTT RECEIVE] Không xác định được topic");
            return;
        }

        try {
            if ("response".equals(topic)) {
                log.info("[MQTT RESPONSE] {}", payload);

                // Xử lý response nhanh, không truy vấn database.
                responseBridgeProvider.getObject()
                        .onResponseReceived(payload);

                return;
            }

            JsonNode node = OBJECT_MAPPER.readTree(payload);

            if ("sensor_data".equals(topic)) {
                handleSensorData(node, dataHandlerProvider);
                return;
            }

            if ("new".equals(topic)) {
                handleNewSensorData(node, dataHandlerProvider);
                return;
            }

            log.warn(
                    "[MQTT RECEIVE] Topic không được hỗ trợ: {}",
                    topic
            );

        } catch (Exception e) {
            log.error(
                    "[MQTT RECEIVE] Lỗi xử lý topic={}, payload={}",
                    topic,
                    payload,
                    e
            );
        }
    }

    private void handleSensorData(
            JsonNode node,
            ObjectProvider<MqttDataHandlerService> dataHandlerProvider
    ) {
        if (!isNumber(node, "temp")
                || !isNumber(node, "humid")
                || !isNumber(node, "light")) {

            log.warn(
                    "[MQTT SENSOR] Payload thiếu temp, humid hoặc light: {}",
                    node
            );

            return;
        }

        Float temp = (float) node.get("temp").asDouble();
        Float humid = (float) node.get("humid").asDouble();
        Float light = (float) node.get("light").asDouble();

        Long timestamp = getTimestamp(node);

        dataHandlerProvider.getObject().onMessageReceived(
                temp,
                humid,
                light,
                timestamp
        );
    }

    private void handleNewSensorData(
            JsonNode node,
            ObjectProvider<MqttDataHandlerService> dataHandlerProvider
    ) {
        if (!isNumber(node, "gas")
                || !isNumber(node, "smoke")
                || !isNumber(node, "motion")) {

            log.warn(
                    "[MQTT SENSOR] Payload thiếu gas, smoke hoặc motion: {}",
                    node
            );

            return;
        }

        Float gas = (float) node.get("gas").asDouble();
        Float smoke = (float) node.get("smoke").asDouble();
        Float motion = (float) node.get("motion").asDouble();

        Long timestamp = getTimestamp(node);

        dataHandlerProvider.getObject().onNewMessageReceived(
                gas,
                smoke,
                motion,
                timestamp
        );
    }

    private boolean isNumber(JsonNode node, String field) {
        return node.hasNonNull(field)
                && node.get(field).isNumber();
    }

    private Long getTimestamp(JsonNode node) {
        if (node.hasNonNull("timestamp")
                && node.get("timestamp").isNumber()) {
            return node.get("timestamp").asLong();
        }

        return null;
    }

    private String getPayloadAsString(Message<?> message) {
        Object payload = message.getPayload();

        if (payload instanceof byte[]) {
            return new String(
                    (byte[]) payload,
                    StandardCharsets.UTF_8
            );
        }

        return String.valueOf(payload);
    }
}

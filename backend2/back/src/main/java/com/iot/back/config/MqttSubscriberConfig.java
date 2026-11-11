
package com.iot.back.config;

import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.channel.DirectChannel;
import org.springframework.integration.mqtt.core.Mqttv3ClientManager;
import org.springframework.integration.mqtt.inbound.MqttPahoMessageDrivenChannelAdapter;
import org.springframework.integration.mqtt.outbound.MqttPahoMessageHandler;
import org.springframework.integration.mqtt.support.DefaultPahoMessageConverter;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
public class MqttSubscriberConfig {

    private static final String BROKER_URL = "tcp://localhost:5555";

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

        Mqttv3ClientManager clientManager = new Mqttv3ClientManager(
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
            Mqttv3ClientManager mqttClientManager
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
        adapter.setOutputChannel(mqttInputChannel());

        return adapter;
    }
}

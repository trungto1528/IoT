package com.iot.back.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

@Override
public void registerStompEndpoints(StompEndpointRegistry registry) {
    registry.addEndpoint("/ws/dashboard")
            .setAllowedOriginPatterns("*") // Thay setAllowedOrigins bằng setAllowedOriginPatterns
            .withSockJS();
}

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Broker cho phép gửi tin nhắn tới các client subscribe vào topic này
        registry.enableSimpleBroker("/topic/dashboard");
        // Prefix cho các message gửi từ client lên server
        registry.setApplicationDestinationPrefixes("/app");
    }
}
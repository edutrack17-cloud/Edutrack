package com.edutrack.sms.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
@EnableConfigurationProperties(SmsConfig.TextBeeProperties.class)
public class SmsConfig {

    @Bean
    public RestTemplate smsRestTemplate() {
        return new RestTemplate();
    }

    @ConfigurationProperties(prefix = "textbee")
    public record TextBeeProperties(String apiKey, String baseUrl) {}
}
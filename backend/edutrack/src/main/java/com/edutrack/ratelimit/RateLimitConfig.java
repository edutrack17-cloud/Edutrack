package com.edutrack.ratelimit;

import io.github.bucket4j.Bandwidth;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class RateLimitConfig {

    @Bean
    public Bandwidth rateLimitBandwidth() {
        return Bandwidth.builder()
                .capacity(50)
                .refillGreedy(50, Duration.ofMinutes(1))
                .build();
    }
}
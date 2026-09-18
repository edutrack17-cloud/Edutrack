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
                // Burst: 30 writes can go through back-to-back (covers
                // admin flows like clone-batch + restore-advisers).
                .capacity(30)
                // Sustained: 120 writes per minute = 2/sec after the burst.
                .refillGreedy(120, Duration.ofMinutes(1))
                .build();
    }
}
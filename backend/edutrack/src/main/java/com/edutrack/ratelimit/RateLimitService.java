package com.edutrack.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimitService {

    private final Bandwidth rateLimitBandwidth;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public RateLimitService(Bandwidth rateLimitBandwidth) {
        this.rateLimitBandwidth = rateLimitBandwidth;
    }

    public boolean isAllowed(String key) {

        Bucket bucket = buckets.computeIfAbsent(
                key,
                this::createBucket
        );

        return bucket.tryConsume(1);
    }

    private Bucket createBucket(String key) {

        return Bucket.builder()
                .addLimit(rateLimitBandwidth)
                .build();
    }
}
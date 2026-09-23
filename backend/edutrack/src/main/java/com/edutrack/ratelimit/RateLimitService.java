package com.edutrack.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimitService {

    private final Bandwidth rateLimitBandwidth;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final Map<String, Bandwidth> featureBandwidths = new ConcurrentHashMap<>();

    public RateLimitService(Bandwidth rateLimitBandwidth) {
        this.rateLimitBandwidth = rateLimitBandwidth;
    }

    /** Global filter entry point — unchanged behaviour. */
    public boolean isAllowed(String key) {
        return isAllowed(key, rateLimitBandwidth);
    }

    /** Feature-specific check. */
    public boolean isAllowed(String key, Bandwidth bandwidth) {
        Bucket bucket = buckets.computeIfAbsent(key, k ->
                Bucket.builder().addLimit(bandwidth).build());
        return bucket.tryConsume(1);
    }

    /** Build/cache a Bandwidth for a named feature so we don't rebuild per request. */
    public Bandwidth bandwidthFor(String feature, int capacity, int refillTokens, int refillPeriodSeconds) {
        return featureBandwidths.computeIfAbsent(feature, f ->
                Bandwidth.builder()
                        .capacity(capacity)
                        .refillGreedy(refillTokens, Duration.ofSeconds(refillPeriodSeconds))
                        .build());
    }
}
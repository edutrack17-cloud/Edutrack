package com.edutrack.ratelimit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface FeatureRateLimit {
    String feature();
    int capacity();
    int refillTokens();
    int refillPeriodSeconds();
}
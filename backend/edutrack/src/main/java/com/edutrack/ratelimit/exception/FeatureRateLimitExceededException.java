package com.edutrack.ratelimit.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class FeatureRateLimitExceededException extends ApplicationException {

    public FeatureRateLimitExceededException(String feature) {
        super(
                "Too many requests for feature '" + feature + "'. Please try again later.",
                HttpStatus.TOO_MANY_REQUESTS
        );
    }
}
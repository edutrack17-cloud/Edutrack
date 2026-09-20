package com.edutrack.sms.dto.response;

public record SmsResponse(
        boolean success,
        String message,
        String batchId // TextBee returns a batch ID for tracking
) {}
package com.edutrack.sms.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record SmsRequest(
        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = "^\\+?[1-9]\\d{1,14}$", message = "Phone number must be in E.164 format (e.g., +15550100123)")
        String phoneNumber,

        @NotBlank(message = "Message cannot be empty")
        String message
) {}
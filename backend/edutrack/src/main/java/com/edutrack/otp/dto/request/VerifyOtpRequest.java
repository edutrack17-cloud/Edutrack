package com.edutrack.otp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyOtpRequest(
        @NotBlank
        @Pattern(regexp = "\\d{6}", message = "OTP must be 6 digits")
        String code
) {}
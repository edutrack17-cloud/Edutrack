package com.edutrack.security.passwordreset.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
        @NotBlank String phoneNumber
) {}
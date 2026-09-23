package com.edutrack.auth.controller;

import com.edutrack.auth.dto.request.ForgotPasswordRequest;
import com.edutrack.auth.dto.request.ResetPasswordRequest;
import com.edutrack.auth.service.PasswordResetService;
import com.edutrack.ratelimit.FeatureRateLimit;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/auth/forgot-password")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    public PasswordResetController(PasswordResetService passwordResetService) {
        this.passwordResetService = passwordResetService;
    }

    /**
     * Step 1: request an OTP via SMS.
     * Always returns 202 Accepted regardless of whether the username exists —
     * this prevents user enumeration.
     *
     * Rate limit: strict, because every accepted call may trigger an SMS.
     */
    @FeatureRateLimit(
            feature = "forgot-password-request",
            capacity = 3,
            refillTokens = 3,
            refillPeriodSeconds = 3600
    )
    @PostMapping("request")
    public ResponseEntity<Void> request(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.username());
        return ResponseEntity.accepted().build();
    }

    /**
     * Step 2: verify the OTP and set a new password.
     * Rate limit: stricter than global writes, looser than request — must
     * balance brute-force protection against the 6-digit code space.
     */
    @FeatureRateLimit(
            feature = "forgot-password-verify",
            capacity = 5,
            refillTokens = 10,
            refillPeriodSeconds = 3600
    )
    @PostMapping("verify")
    public ResponseEntity<Void> verify(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.completeReset(request);
        return ResponseEntity.noContent().build();
    }
}
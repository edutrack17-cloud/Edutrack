package com.edutrack.otp.controller;

import com.edutrack.otp.dto.request.VerifyOtpRequest;
import com.edutrack.otp.enums.OtpPurpose;
import com.edutrack.otp.service.OtpService;
import com.edutrack.ratelimit.FeatureRateLimit;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/otp")
public class OtpController {

    private final OtpService otpService;

    public OtpController(OtpService otpService) {
        this.otpService = otpService;
    }

    /**
     * Request an OTP. Expensive — sends SMS.
     * Strict limit: 3 per hour per (admin, target) pair.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @FeatureRateLimit(
            feature = "otp-request-password-reset",
            capacity = 3,
            refillTokens = 3,
            refillPeriodSeconds = 3600
    )
    @PostMapping("/password-reset/{userId}/request")
    public ResponseEntity<Void> requestPasswordResetOtp(@PathVariable Long userId) {
        otpService.issueOtp(userId, OtpPurpose.PASSWORD_RESET);
        return ResponseEntity.accepted().build();
    }

    /**
     * Verify an OTP. Weaker per-request cost, but critical to limit brute-force:
     * 6-digit code = 1M combos → 5 attempts per token + this bucket = safe.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @FeatureRateLimit(
            feature = "otp-verify-password-reset",
            capacity = 10,
            refillTokens = 30,
            refillPeriodSeconds = 3600
    )
    @PostMapping("/password-reset/{userId}/verify")
    public ResponseEntity<Void> verifyPasswordResetOtp(
            @PathVariable Long userId,
            @Valid @RequestBody VerifyOtpRequest request) {
        otpService.verifyOtp(userId, OtpPurpose.PASSWORD_RESET, request);
        return ResponseEntity.noContent().build();
    }
}
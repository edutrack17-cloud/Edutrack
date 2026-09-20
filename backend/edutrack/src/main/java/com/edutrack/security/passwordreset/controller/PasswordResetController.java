package com.edutrack.security.passwordreset.controller;


import com.edutrack.security.passwordreset.dto.request.ForgotPasswordRequest;
import com.edutrack.security.passwordreset.dto.request.ResetPasswordRequest;
import com.edutrack.security.passwordreset.service.PasswordResetService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth/password")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    public PasswordResetController(PasswordResetService passwordResetService) {
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/forgot")
    public ResponseEntity<String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestPasswordReset(request.phoneNumber());
        return ResponseEntity.ok("If the account exists, an OTP has been sent.");
    }

    @PostMapping("/reset")
    public ResponseEntity<String> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.otp(), request.newPassword());
        return ResponseEntity.ok("Password reset successful.");
    }
}
package com.edutrack.auth.service;

import com.edutrack.auth.dto.request.ResetPasswordRequest;
import com.edutrack.otp.enums.OtpPurpose;
import com.edutrack.otp.exception.OtpInvalidException;
import com.edutrack.otp.service.OtpService;
import com.edutrack.refreshtoken.service.RefreshTokenService;
import com.edutrack.user.entity.User;
import com.edutrack.user.enums.AccountStatus;
import com.edutrack.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    private final UserRepository userRepository;
    private final OtpService otpService;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;

    public PasswordResetService(UserRepository userRepository,
                                OtpService otpService,
                                PasswordEncoder passwordEncoder,
                                RefreshTokenService refreshTokenService) {
        this.userRepository = userRepository;
        this.otpService = otpService;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenService = refreshTokenService;
    }

    /**
     * Kicks off the forgot-password flow.
     *
     * Intentionally does NOT reveal whether the username exists — always returns
     * normally, even if the user is unknown or has no phone on file. The controller
     * always responds 202 Accepted.
     */
    @Transactional
    public void requestReset(String username) {
        Optional<User> maybeUser = userRepository.findByUsername(username);

        if (maybeUser.isEmpty()) {
            log.info("Forgot-password requested for unknown username '{}' — silently ignored", username);
            return;
        }

        User user = maybeUser.get();

        if (user.getUserRole() == com.edutrack.user.enums.UserRole.admin) {
            // Admins should not use self-service reset; they are managed by other admins.
            log.info("Forgot-password requested for admin '{}' — silently ignored", username);
            return;
        }

        if (user.getAccountStatus() == AccountStatus.disabled) {
            log.info("Forgot-password requested for disabled user '{}' — silently ignored", username);
            return;
        }

        if (user.getContactNumber() == null || user.getContactNumber().isBlank()) {
            log.warn("Forgot-password requested for user '{}' but no contact number on file", username);
            return;
        }

        otpService.issueOtp(user.getUserId(), OtpPurpose.PASSWORD_RESET);
    }

    /**
     * Verifies the OTP and replaces the user's password.
     * Revokes all refresh tokens so any stolen session is invalidated.
     */
    @Transactional
    public void completeReset(ResetPasswordRequest request) {
        User user = userRepository.findByUsername(request.username())
                .orElseThrow(OtpInvalidException::new);
        // ↑ We deliberately return the same "invalid code" error for unknown usernames
        //   so an attacker can't distinguish "user missing" from "code wrong".

        if (user.getUserRole() == com.edutrack.user.enums.UserRole.admin) {
            throw new com.edutrack.otp.exception.OtpInvalidException();
        }

        if (user.getAccountStatus() == AccountStatus.disabled) {
            throw new com.edutrack.otp.exception.OtpInvalidException();
        }

        // Verify — throws OtpInvalidException / OtpExpiredException / OtpMaxAttemptsException
        otpService.verifyOtp(
                user.getUserId(),
                OtpPurpose.PASSWORD_RESET,
                new com.edutrack.otp.dto.request.VerifyOtpRequest(request.code())
        );

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        // Force re-login everywhere
        refreshTokenService.revokeAllForUser(user);

        log.info("Password successfully reset for user '{}'", user.getUsername());
    }
}
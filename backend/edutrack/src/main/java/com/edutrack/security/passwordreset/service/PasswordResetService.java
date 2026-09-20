package com.edutrack.security.passwordreset.service;

import com.edutrack.security.passwordreset.entity.PasswordResetToken;
import com.edutrack.security.passwordreset.repository.PasswordResetTokenRepository;
import com.edutrack.sms.dto.request.SmsRequest;
import com.edutrack.sms.service.SmsService;
import com.edutrack.user.entity.User;
import com.edutrack.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;

@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final SecureRandom random = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final SmsService smsService;
    private final PasswordEncoder passwordEncoder;

    public PasswordResetService(UserRepository userRepository,
                                PasswordResetTokenRepository tokenRepository,
                                SmsService smsService,
                                PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.smsService = smsService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void requestPasswordReset(String phoneNumber) {
        // 1. Find user by phone number — adjust based on your User entity
        User user = userRepository.findByContactNumber(phoneNumber)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 2. Invalidate any existing unused tokens for this user
        tokenRepository.deleteByUserId(user.getUserId());

        // 3. Generate 6-digit OTP
        String otp = String.format("%06d", random.nextInt(1_000_000));

        // 4. Save token
        PasswordResetToken token = new PasswordResetToken();
        token.setToken(otp);
        token.setUserId(user.getUserId());
        tokenRepository.save(token);

        // 5. Send via existing SmsService
        String message = String.format(
                "Your EduTrack password reset code is: %s. Valid for 10 minutes. Do not share this code with anyone.",
                otp
        );
        smsService.sendSms(new SmsRequest(toE164(phoneNumber), message));

        log.info("Password reset OTP sent to user {}", user.getUserId());
    }

    @Transactional
    public void resetPassword(String otp, String newPassword) {
        PasswordResetToken token = tokenRepository.findByTokenAndUsedFalse(otp)
                .orElseThrow(() -> new RuntimeException("Invalid or expired OTP"));

        if (token.getExpiryDate().isBefore(java.time.LocalDateTime.now())) {
            throw new RuntimeException("OTP has expired");
        }

        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        token.setUsed(true);
        tokenRepository.save(token);

        log.info("Password reset successful for user {}", user.getUserId());
    }

    private String toE164(String phone) {
        String digits = phone.replaceAll("\\D", "");
        if (digits.startsWith("0") && digits.length() == 11) {
            return "+63" + digits.substring(1);
        }
        if (digits.startsWith("9") && digits.length() == 10) {
            return "+63" + digits;
        }
        return "+" + digits;
    }
}
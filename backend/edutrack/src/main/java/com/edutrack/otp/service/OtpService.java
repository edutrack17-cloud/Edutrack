package com.edutrack.otp.service;

import com.edutrack.otp.dto.request.VerifyOtpRequest;
import com.edutrack.otp.entity.OtpToken;
import com.edutrack.otp.enums.OtpPurpose;
import com.edutrack.otp.exception.OtpInvalidException;
import com.edutrack.otp.exception.OtpExpiredException;
import com.edutrack.otp.exception.OtpMaxAttemptsException;
import com.edutrack.otp.exception.OtpNotFoundException;
import com.edutrack.otp.repository.OtpTokenRepository;
import com.edutrack.otp.util.OtpCodeGenerator;
import com.edutrack.sms.dto.request.SmsRequest;
import com.edutrack.sms.service.SmsService;
import com.edutrack.user.entity.User;
import com.edutrack.user.repository.UserRepository;
import com.edutrack.user.exception.UserNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
public class OtpService {

    private static final Logger log = LoggerFactory.getLogger(OtpService.class);
    private static final Duration OTP_TTL = Duration.ofMinutes(5);

    private final OtpTokenRepository otpTokenRepository;
    private final UserRepository userRepository;
    private final SmsService smsService;
    private final PasswordEncoder passwordEncoder;

    public OtpService(OtpTokenRepository otpTokenRepository,
                      UserRepository userRepository,
                      SmsService smsService,
                      PasswordEncoder passwordEncoder) {
        this.otpTokenRepository = otpTokenRepository;
        this.userRepository = userRepository;
        this.smsService = smsService;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Issues a fresh OTP for the user and sends it via SMS.
     * Any previous unconsumed OTPs for the same purpose are invalidated.
     */
    @Transactional
    public void issueOtp(Long userId, OtpPurpose purpose) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        String phone = user.getContactNumber();
        if (phone == null || phone.isBlank()) {
            throw new IllegalStateException("User has no contact number");
        }

        // Invalidate any prior codes for this user+purpose
        otpTokenRepository.invalidateAllFor(userId, purpose, LocalDateTime.now());

        String rawCode = OtpCodeGenerator.generate6Digits();

        OtpToken token = new OtpToken();
        token.setUserId(userId);
        token.setPurpose(purpose);
        token.setCodeHash(passwordEncoder.encode(rawCode));
        token.setExpiresAt(LocalDateTime.now().plus(OTP_TTL));
        otpTokenRepository.save(token);

        String message = "Your EduTrack verification code is " + rawCode
                + ". Valid for 5 minutes. Do not share this code.";
        smsService.sendSms(new SmsRequest(toE164(phone), message));

        log.info("OTP issued for user {} purpose {}", userId, purpose);
    }

    /**
     * Verifies a code, marks the token consumed on success.
     * Throws domain-specific exceptions on failure.
     */
    @Transactional
    public void verifyOtp(Long userId, OtpPurpose purpose, VerifyOtpRequest request) {
        OtpToken token = otpTokenRepository
                .findTopByUserIdAndPurposeAndConsumedFalseOrderByCreatedAtDesc(userId, purpose)
                .orElseThrow(OtpNotFoundException::new);

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new OtpExpiredException();
        }

        if (token.getAttempts() >= token.getMaxAttempts()) {
            throw new OtpMaxAttemptsException();
        }

        if (!passwordEncoder.matches(request.code(), token.getCodeHash())) {
            token.setAttempts(token.getAttempts() + 1);
            otpTokenRepository.save(token);
            throw new OtpInvalidException();
        }

        token.setConsumed(true);
        token.setConsumedAt(LocalDateTime.now());
        otpTokenRepository.save(token);
    }

    private String toE164(String localPhone) {
        String digits = localPhone.replaceAll("\\D", "");
        if (digits.startsWith("63") && digits.length() == 12) return "+" + digits;
        if (digits.startsWith("0") && digits.length() == 11) return "+63" + digits.substring(1);
        if (digits.startsWith("9") && digits.length() == 10) return "+63" + digits;
        return "+" + digits;
    }
}
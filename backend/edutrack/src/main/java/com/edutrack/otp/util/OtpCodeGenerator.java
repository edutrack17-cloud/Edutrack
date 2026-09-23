package com.edutrack.otp.util;

import java.security.SecureRandom;

public final class OtpCodeGenerator {

    private static final SecureRandom RANDOM = new SecureRandom();

    private OtpCodeGenerator() {}

    public static String generate6Digits() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }
}
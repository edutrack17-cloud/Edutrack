package com.edutrack.otp.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class OtpExpiredException extends ApplicationException {
    public OtpExpiredException() {
        super("Verification code has expired. Please request a new one.", HttpStatus.GONE);
    }
}

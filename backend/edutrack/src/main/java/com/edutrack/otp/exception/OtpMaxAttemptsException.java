package com.edutrack.otp.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class OtpMaxAttemptsException extends ApplicationException {
    public OtpMaxAttemptsException() {
        super("Invalid verification code.", HttpStatus.BAD_REQUEST);
    }
}

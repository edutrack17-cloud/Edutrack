package com.edutrack.otp.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class OtpInvalidException extends ApplicationException {
    public OtpInvalidException() {
        super("Too many attempts. Please request a new code.", HttpStatus.TOO_MANY_REQUESTS);
    }
}

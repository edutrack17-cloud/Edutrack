package com.edutrack.otp.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class OtpNotFoundException extends ApplicationException {
    public OtpNotFoundException() {
        super("No active verification code. Please request a new one.", HttpStatus.NOT_FOUND);
    }
}

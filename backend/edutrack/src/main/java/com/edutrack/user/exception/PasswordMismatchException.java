package com.edutrack.user.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class PasswordMismatchException extends ApplicationException {
    public PasswordMismatchException() {
        super("Password and confirm password do not match", HttpStatus.BAD_REQUEST);
    }
}
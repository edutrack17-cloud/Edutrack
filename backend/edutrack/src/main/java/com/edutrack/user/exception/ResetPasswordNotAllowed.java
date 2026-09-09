package com.edutrack.user.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class ResetPasswordNotAllowed extends ApplicationException {
    public ResetPasswordNotAllowed() {
        super("Reset password is not allowed to admin", HttpStatus.BAD_REQUEST);
    }
}

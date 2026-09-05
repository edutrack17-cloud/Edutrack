package com.edutrack.user.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class AccountAlreadyActive extends ApplicationException {
    public AccountAlreadyActive() {
        super("This account is already active", HttpStatus.BAD_REQUEST);
    }
}

package com.edutrack.user.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class AccountAlreadyDisabled extends ApplicationException {
    public AccountAlreadyDisabled() {
        super("This account is already disabled", HttpStatus.BAD_REQUEST);
    }
}

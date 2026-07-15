package com.edutrack.user.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class AccountDisabled extends ApplicationException {
    public AccountDisabled() {
        super("Only active user accounts can be assigned as advisers.", HttpStatus.BAD_REQUEST);
    }
}
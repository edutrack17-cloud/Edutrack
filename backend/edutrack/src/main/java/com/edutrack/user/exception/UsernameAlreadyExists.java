package com.edutrack.user.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class UsernameAlreadyExists extends ApplicationException {
    public UsernameAlreadyExists(String username) {
        super("The %s username is already taken".formatted(username), HttpStatus.CONFLICT);
    }
}

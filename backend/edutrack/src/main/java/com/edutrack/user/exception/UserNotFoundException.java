package com.edutrack.user.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class UserNotFoundException extends ApplicationException {
    public UserNotFoundException(Long userId) {
        super("User with ID %d was not found".formatted(userId), HttpStatus.NOT_FOUND);
    }
}

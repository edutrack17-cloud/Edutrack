package com.edutrack.user.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class InvalidRole extends ApplicationException {
    public InvalidRole() {
        super("This account is not allowed to access this feature", HttpStatus.UNAUTHORIZED);
    }
}

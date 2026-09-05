package com.edutrack.user.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class UserRoleIsAdmin extends ApplicationException {
    public UserRoleIsAdmin() {
        super("This user is an admin, disable account not allowed", HttpStatus.NOT_ACCEPTABLE);
    }
}

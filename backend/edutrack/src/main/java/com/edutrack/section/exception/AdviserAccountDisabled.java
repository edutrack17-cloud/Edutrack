package com.edutrack.section.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class AdviserAccountDisabled extends ApplicationException {
    public AdviserAccountDisabled() {
        super("Disabled account is not allowed to be an adviser", HttpStatus.BAD_REQUEST);
    }
}

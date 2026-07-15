package com.edutrack.shared.exception;

import org.springframework.http.HttpStatus;

public class NoChangesDetected extends ApplicationException {
    public NoChangesDetected() {
        super("There are no changes detected", HttpStatus.BAD_REQUEST);
    }
}

package com.edutrack.section.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class AdviserRequired extends ApplicationException {
    public AdviserRequired() {
        super("Adviser is required", HttpStatus.BAD_REQUEST);
    }
}

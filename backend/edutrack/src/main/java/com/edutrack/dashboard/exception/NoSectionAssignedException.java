package com.edutrack.dashboard.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class NoSectionAssignedException extends ApplicationException {
    public NoSectionAssignedException(Long userId) {
        super("No active section assignment found for adviser ID %d".formatted(userId), HttpStatus.CONFLICT);
    }
}
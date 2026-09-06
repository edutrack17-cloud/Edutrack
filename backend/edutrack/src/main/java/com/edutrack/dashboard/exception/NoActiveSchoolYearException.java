package com.edutrack.dashboard.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class NoActiveSchoolYearException extends ApplicationException {
    public NoActiveSchoolYearException() {
        super("No active school year is currently configured", HttpStatus.CONFLICT);
    }
}
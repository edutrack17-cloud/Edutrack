package com.edutrack.schoolyear.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class SchoolYearAlreadyActive extends ApplicationException {
    public SchoolYearAlreadyActive() {
        super("This school year is already active", HttpStatus.BAD_REQUEST);
    }
}

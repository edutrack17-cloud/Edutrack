package com.edutrack.schoolyear.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class SchoolYearAlreadyClosed extends ApplicationException {
    public SchoolYearAlreadyClosed() {
        super("This school year is already closed", HttpStatus.BAD_REQUEST);
    }
}

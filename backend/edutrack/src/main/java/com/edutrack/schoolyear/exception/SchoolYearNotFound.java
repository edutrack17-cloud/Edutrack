package com.edutrack.schoolyear.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class SchoolYearNotFound extends ApplicationException {
    public SchoolYearNotFound() {
        super("School year not found", HttpStatus.NOT_FOUND);
    }
}

package com.edutrack.schoolyear.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class SchoolYearAlreadyExists extends ApplicationException {
    public SchoolYearAlreadyExists(String schoolYearName) {
        super("School year %s already exists".formatted(schoolYearName), HttpStatus.CONFLICT);
    }
}

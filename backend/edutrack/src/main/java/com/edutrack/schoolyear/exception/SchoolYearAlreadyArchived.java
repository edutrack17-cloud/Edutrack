package com.edutrack.schoolyear.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class SchoolYearAlreadyArchived extends ApplicationException {
    public SchoolYearAlreadyArchived() {
        super("This school year is already archived", HttpStatus.BAD_REQUEST);
    }
}

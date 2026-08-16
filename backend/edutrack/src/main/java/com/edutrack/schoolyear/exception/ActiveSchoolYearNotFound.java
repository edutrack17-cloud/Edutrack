package com.edutrack.schoolyear.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class ActiveSchoolYearNotFound extends ApplicationException {
    public ActiveSchoolYearNotFound() {
        super("Active school year not found", HttpStatus.NOT_FOUND);
    }
}

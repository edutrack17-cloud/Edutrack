package com.edutrack.schoolyear.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class InvalidSchoolYearDateRange extends ApplicationException {
    public InvalidSchoolYearDateRange() {
        super("Start date must be before end date", HttpStatus.BAD_REQUEST);
    }
}

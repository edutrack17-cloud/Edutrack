package com.edutrack.section.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class SourceSchoolYearNotEligible extends ApplicationException {
    public SourceSchoolYearNotEligible() {
        super("Source school year must be active or already closed to start a new school year.", HttpStatus.BAD_REQUEST);
    }
}
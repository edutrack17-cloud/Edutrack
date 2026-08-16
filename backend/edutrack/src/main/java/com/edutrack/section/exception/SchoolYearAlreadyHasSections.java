package com.edutrack.section.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class SchoolYearAlreadyHasSections extends ApplicationException {
    public SchoolYearAlreadyHasSections() {
        super("Target school year already has sections", HttpStatus.CONFLICT);
    }
}

package com.edutrack.section.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class SchoolYearNotPlanning extends ApplicationException {
    public SchoolYearNotPlanning() {
        super("The school year status must be 'planning'", HttpStatus.BAD_REQUEST);
    }
}

package com.edutrack.schoolyear.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class SchoolYearAlreadyPlanning extends ApplicationException {
    public SchoolYearAlreadyPlanning() {
        super("This school year is already marked planning", HttpStatus.BAD_REQUEST);
    }
}

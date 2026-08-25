package com.edutrack.schoolyear.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class ActiveSchoolYearAlreadyExists extends ApplicationException {
    public ActiveSchoolYearAlreadyExists() {
        super("Active school year already exists", HttpStatus.CONFLICT);
    }
}

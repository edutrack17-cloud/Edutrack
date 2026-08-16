package com.edutrack.section.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class SameSchoolYearNotAllowed extends ApplicationException {
    public SameSchoolYearNotAllowed() {
        super("The new school year can't be the previous school year", HttpStatus.BAD_REQUEST);
    }
}

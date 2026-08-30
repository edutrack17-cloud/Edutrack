package com.edutrack.schoolyear.exception;

import com.edutrack.schoolyear.entity.SchoolYear;
import com.edutrack.schoolyear.enums.SchoolYearStatus;
import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class InvalidSchoolYearTransition extends ApplicationException {
    public InvalidSchoolYearTransition(SchoolYearStatus from, SchoolYearStatus to) {
        super("Cannot transition school year from " + from + " to " + to + ".", HttpStatus.BAD_REQUEST);
    }
}

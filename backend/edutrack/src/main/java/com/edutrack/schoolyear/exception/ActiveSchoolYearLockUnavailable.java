package com.edutrack.schoolyear.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class ActiveSchoolYearLockUnavailable extends ApplicationException {
    public ActiveSchoolYearLockUnavailable() {
        super("School year does not exist", HttpStatus.NOT_FOUND);
    }
}

package com.edutrack.attendance.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class AlreadyMarkedAbsent extends ApplicationException {
    public AlreadyMarkedAbsent() {
        super("Student has already been marked absent for today and cannot be marked present.", HttpStatus.BAD_REQUEST);
    }
}
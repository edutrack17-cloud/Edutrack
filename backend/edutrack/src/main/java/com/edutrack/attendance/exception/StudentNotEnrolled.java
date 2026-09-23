package com.edutrack.attendance.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class StudentNotEnrolled extends ApplicationException {
    public StudentNotEnrolled() {
        super("Cannot record attendance: student is no longer enrolled.", HttpStatus.BAD_REQUEST);
    }
}
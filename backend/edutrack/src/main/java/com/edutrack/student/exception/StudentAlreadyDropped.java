package com.edutrack.student.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class StudentAlreadyDropped extends ApplicationException {
    public StudentAlreadyDropped() {
        super("This student is already dropped out", HttpStatus.BAD_REQUEST);
    }
}

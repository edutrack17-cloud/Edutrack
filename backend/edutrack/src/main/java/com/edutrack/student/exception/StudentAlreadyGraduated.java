package com.edutrack.student.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class StudentAlreadyGraduated extends ApplicationException {
    public StudentAlreadyGraduated() {
        super("This student is already graduated", HttpStatus.BAD_REQUEST);
    }
}

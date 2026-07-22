package com.edutrack.student.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class StudentAlreadyExists extends ApplicationException {
    public StudentAlreadyExists(String lrn) {
        super("Student with the LRN of %s is already enrolled".formatted(lrn), HttpStatus.CONFLICT);
    }
}

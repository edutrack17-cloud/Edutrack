package com.edutrack.student.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class StudentNotFound extends ApplicationException {
    public StudentNotFound(Long studentId) {
        super("Student with Student ID: %d does not exist".formatted(studentId), HttpStatus.NOT_FOUND);
    }
}

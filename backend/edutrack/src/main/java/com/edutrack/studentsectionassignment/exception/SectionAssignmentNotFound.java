package com.edutrack.studentsectionassignment.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class SectionAssignmentNotFound extends ApplicationException {
    public SectionAssignmentNotFound(Long studentId) {
        super("Section assignment with %d Student ID does not exist".formatted(studentId), HttpStatus.NOT_FOUND);
    }
}

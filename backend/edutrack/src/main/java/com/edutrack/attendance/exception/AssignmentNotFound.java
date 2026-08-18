package com.edutrack.attendance.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class AssignmentNotFound extends ApplicationException {
    public AssignmentNotFound() {
        super("Student section assignment not found", HttpStatus.NOT_FOUND);
    }
}

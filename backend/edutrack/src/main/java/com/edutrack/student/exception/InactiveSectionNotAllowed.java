package com.edutrack.student.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class InactiveSectionNotAllowed extends ApplicationException {
    public InactiveSectionNotAllowed() {
        super("Student can't be enrolled into an inactive section", HttpStatus.BAD_REQUEST);
    }
}

package com.edutrack.student.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class StudentAlreadyTransferredOut extends ApplicationException {
    public StudentAlreadyTransferredOut() {
        super("This student is already transferred out", HttpStatus.BAD_REQUEST);
    }
}

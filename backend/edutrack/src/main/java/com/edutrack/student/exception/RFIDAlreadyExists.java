package com.edutrack.student.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class RFIDAlreadyExists extends ApplicationException {
    public RFIDAlreadyExists() {
        super("This RFID is already taken", HttpStatus.CONFLICT);
    }
}

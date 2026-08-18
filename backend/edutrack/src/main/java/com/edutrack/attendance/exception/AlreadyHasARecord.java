package com.edutrack.attendance.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class AlreadyHasARecord extends ApplicationException {
    public AlreadyHasARecord() {
        super("This student already has a record", HttpStatus.CONFLICT);
    }
}

package com.edutrack.attendance.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class AlreadyTimedOut extends ApplicationException {
    public AlreadyTimedOut() {
        super("This student is already marked as timed out", HttpStatus.BAD_REQUEST);
    }
}

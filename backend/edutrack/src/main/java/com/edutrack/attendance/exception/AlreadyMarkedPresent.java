package com.edutrack.attendance.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class AlreadyMarkedPresent extends ApplicationException {
    public AlreadyMarkedPresent() {
        super("This attendance is already marked as present", HttpStatus.BAD_REQUEST);
    }
}

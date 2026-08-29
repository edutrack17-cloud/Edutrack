package com.edutrack.attendance.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class NoClassromTap extends ApplicationException {
    public NoClassromTap() {
        super("This student didn't tap their card on the classroom yet", HttpStatus.BAD_REQUEST);
    }
}

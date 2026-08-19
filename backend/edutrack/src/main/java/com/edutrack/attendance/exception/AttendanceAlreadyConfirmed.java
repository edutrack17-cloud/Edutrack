package com.edutrack.attendance.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class AttendanceAlreadyConfirmed extends ApplicationException {
    public AttendanceAlreadyConfirmed() {
        super("This attendance is already confirmed", HttpStatus.BAD_REQUEST);
    }
}

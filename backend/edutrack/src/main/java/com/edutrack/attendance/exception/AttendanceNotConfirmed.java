package com.edutrack.attendance.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class AttendanceNotConfirmed extends ApplicationException {
    public AttendanceNotConfirmed() {
        super("Your attendance is not yet confirmed, tap your RFID Card on the teacher's scanner", HttpStatus.BAD_REQUEST);
    }
}

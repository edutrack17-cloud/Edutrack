package com.edutrack.attendance.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class AttendanceNotFound extends ApplicationException {
    public AttendanceNotFound() {
        super("Attendance not found", HttpStatus.NOT_FOUND);
    }
}

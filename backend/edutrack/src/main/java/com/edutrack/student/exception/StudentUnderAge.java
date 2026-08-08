package com.edutrack.student.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class StudentUnderAge extends ApplicationException {
    public StudentUnderAge() {
        super("This student is below the required age", HttpStatus.BAD_REQUEST);
    }
}

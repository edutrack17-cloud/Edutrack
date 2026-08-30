package com.edutrack.section.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class TeacherAccountDisabled extends ApplicationException {
    public TeacherAccountDisabled() {
        super("Disabled account can not be an adviser", HttpStatus.BAD_REQUEST);
    }
}

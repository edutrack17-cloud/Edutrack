package com.edutrack.section.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class SectionHasEnrolledStudents extends ApplicationException {
    public SectionHasEnrolledStudents() {
        super("This section has enrolled students, archive not allowed", HttpStatus.BAD_REQUEST);
    }
}

package com.edutrack.schoolyear.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class ArchiveNotAllowed extends ApplicationException {
    public ArchiveNotAllowed() {
        super("Archiving active school year is not allowed", HttpStatus.BAD_REQUEST);
    }
}

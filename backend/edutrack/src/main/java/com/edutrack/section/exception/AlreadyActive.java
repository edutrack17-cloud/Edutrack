package com.edutrack.section.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class AlreadyActive extends ApplicationException {
    public AlreadyActive(String sectionName, int sectionId) {
        super("Section %s with SectionID: %d is already active".formatted(sectionName, sectionId), HttpStatus.BAD_REQUEST);
    }
}

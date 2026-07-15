package com.edutrack.section.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class SectionAlreadyExists extends ApplicationException {
    public SectionAlreadyExists(String sectionName) {
        super("Section %s already exists.".formatted(sectionName), HttpStatus.CONFLICT);
    }
}

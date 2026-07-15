package com.edutrack.section.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class SectionNotFound extends ApplicationException {
    public SectionNotFound(int sectionId) {
        super("Section with %d doesn't exists".formatted(sectionId), HttpStatus.NOT_FOUND);
    }
}

package com.edutrack.section.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class AlreadyArchived extends ApplicationException {
    public AlreadyArchived(String sectionName, int sectionId) {
        super("Section %s with SectionID: %d is already archived".formatted(sectionName, sectionId), HttpStatus.BAD_REQUEST);
    }
}

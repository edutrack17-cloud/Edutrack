package com.edutrack.section.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class AdvisorySectionNotFound extends ApplicationException {
    public AdvisorySectionNotFound() {
        super("This teacher is not an adviser of any section", HttpStatus.NOT_FOUND);
    }
}

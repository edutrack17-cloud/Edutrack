package com.edutrack.section.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class SchoolYearSectionsNotFound extends ApplicationException {
    public SchoolYearSectionsNotFound() {
        super("This school year doesn't have sections yet", HttpStatus.NOT_FOUND);
    }
}

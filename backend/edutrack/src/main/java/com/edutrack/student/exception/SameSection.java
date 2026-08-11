package com.edutrack.student.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class SameSection extends ApplicationException {
    public SameSection(String studentName, String sectionName) {
        super("Student %s already belongs to section %s".formatted(studentName, sectionName), HttpStatus.BAD_REQUEST);
    }
}

package com.edutrack.user.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class ContactNumberAlreadyExists extends ApplicationException {
    public ContactNumberAlreadyExists(String contactNumber) {
        super("Contact number already exists: " + contactNumber, HttpStatus.CONFLICT);
    }
}
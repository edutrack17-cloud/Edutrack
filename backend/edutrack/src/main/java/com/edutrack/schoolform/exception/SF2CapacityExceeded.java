package com.edutrack.schoolform.exception;

import com.edutrack.shared.exception.ApplicationException;
import org.springframework.http.HttpStatus;

public class SF2CapacityExceeded extends ApplicationException {
    public SF2CapacityExceeded(String block, int count) {
        super("SF2 template cannot fit %d entries in the %s block".formatted(count, block),
                HttpStatus.UNPROCESSABLE_ENTITY);
    }
}
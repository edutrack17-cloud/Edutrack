package com.edutrack.student.dto.request;

import java.time.LocalDate;

public record UpdateStudentStatusRequest(
        String remarks,
        LocalDate leftAt
) {}

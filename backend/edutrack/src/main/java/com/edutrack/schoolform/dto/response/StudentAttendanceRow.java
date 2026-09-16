package com.edutrack.schoolform.dto.response;

import java.time.LocalDate;
import java.util.Map;

public record StudentAttendanceRow(
        long studentId,
        String studentName,
        String lrn,
        // Map of Date to Status (e.g., "2024-02-01" -> "P")
        Map<LocalDate, String> attendance
) {}
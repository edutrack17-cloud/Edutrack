package com.edutrack.schoolform.dto.response;

import java.time.LocalDate;
import java.util.List;

public record SF2TableResponse(
        String schoolYear,
        String gradeLevel,
        String sectionName,
        String month,
        List<LocalDate> schoolDays,
        List<StudentAttendanceRow> students
) {}
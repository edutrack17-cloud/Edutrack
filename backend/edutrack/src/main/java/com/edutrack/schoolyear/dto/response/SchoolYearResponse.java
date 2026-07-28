package com.edutrack.schoolyear.dto.response;

import com.edutrack.schoolyear.enums.SchoolYearStatus;
import java.time.LocalDate;

public record SchoolYearResponse(
        Long schoolYearId,
        String schoolYearName,
        LocalDate startDate,
        LocalDate endDate,
        SchoolYearStatus schoolYearStatus,
        LocalDate createdAt
) {}

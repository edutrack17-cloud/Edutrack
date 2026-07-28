package com.edutrack.schoolyear.dto.request;

import com.edutrack.schoolyear.enums.SchoolYearStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreateSchoolYearRequest(
        @NotBlank(message = "School year name is required")
        String schoolYearName,

        @NotNull(message = "Start date is required")
        LocalDate startDate,

        @NotNull(message = "End date is required")
        LocalDate endDate,

        @NotNull(message = "School year status is required")
        SchoolYearStatus schoolYearStatus
) {}

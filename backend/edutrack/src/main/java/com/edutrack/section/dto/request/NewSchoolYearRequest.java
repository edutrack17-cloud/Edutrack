package com.edutrack.section.dto.request;

import com.edutrack.section.enums.GradeLevel;
import jakarta.validation.constraints.NotNull;

public record NewSchoolYearRequest(
        @NotNull
        Long sourceSchoolYearId,
        @NotNull
        Long targetSchoolYearId,
        @NotNull
        GradeLevel gradeLevel
) {}
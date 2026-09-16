package com.edutrack.section.dto.request;

import com.edutrack.section.enums.GradeLevel;
import jakarta.validation.constraints.NotNull;

public record NewSchoolYearRequest(
        @NotNull
        Long sourceSchoolYearId,

        @NotNull
        Long targetSchoolYearId,

        // FIX: allow null so the caller can clone ALL grade levels at once
        GradeLevel gradeLevel
) {}
package com.edutrack.section.dto.request;

import com.edutrack.section.enums.GradeLevel;

public record NewSchoolYearRequest(
        Long sourceSchoolYearId,
        Long targetSchoolYearId,
        GradeLevel gradeLevel
) {}
package com.edutrack.section.dto.response;

import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.enums.SectionStatus;

public record SectionResponse(
        int sectionId,
        String sectionName,
        Long schoolYearId,       // <-- ADD
        String schoolYear,       // keep for display
        GradeLevel gradeLevel,
        SectionStatus sectionStatus,
        String adviser
) {}
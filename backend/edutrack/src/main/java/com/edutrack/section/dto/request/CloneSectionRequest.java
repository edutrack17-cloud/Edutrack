package com.edutrack.section.dto.request;

import com.edutrack.section.enums.GradeLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CloneSectionRequest(
        @NotBlank(message = "Section name is required") String sectionName,
        @NotNull(message = "School year is required")   Long schoolYear,
        @NotNull(message = "Grade level is required")   GradeLevel gradeLevel,
        // Optional: cloned sections may have no adviser yet.
        Long userId
) {}
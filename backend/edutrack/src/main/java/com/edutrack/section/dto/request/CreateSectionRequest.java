package com.edutrack.section.dto.request;

import com.edutrack.section.enums.GradeLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateSectionRequest(
   @NotBlank(message = "Section name is required")
   String sectionName,

   @NotNull(message = "School year is required")
   Long schoolYear,

   @NotNull(message = "Grade level is required")
   GradeLevel gradeLevel,

   @NotNull(message = "Adviser is required")
   Long userId
) {}

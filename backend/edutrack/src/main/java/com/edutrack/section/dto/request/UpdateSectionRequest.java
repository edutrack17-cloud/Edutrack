package com.edutrack.section.dto.request;

import com.edutrack.section.enums.GradeLevel;
import jakarta.validation.constraints.Size;

public record UpdateSectionRequest(
   @Size(max = 100)
   String sectionName,

   Long schoolYear,

   GradeLevel gradeLevel,

   Long userId
) {}

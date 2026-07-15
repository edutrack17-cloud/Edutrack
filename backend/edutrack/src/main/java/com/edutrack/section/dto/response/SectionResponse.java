package com.edutrack.section.dto.response;

import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.enums.SectionStatus;

public record SectionResponse(
   int sectionId,
   String sectionName,
   GradeLevel gradeLevel,
   SectionStatus sectionStatus,
   String adviser
) {}

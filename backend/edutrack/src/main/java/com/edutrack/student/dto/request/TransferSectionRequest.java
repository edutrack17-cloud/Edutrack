package com.edutrack.student.dto.request;

import jakarta.validation.constraints.Positive;

public record TransferSectionRequest(
   @Positive
   int sectionId
) {}

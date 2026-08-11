package com.edutrack.student.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;

import java.util.List;

public record BulkPromotionRequest(
   @NotEmpty
   List<Long> studentIds,

   @Positive
   int targetSectionId
) {}

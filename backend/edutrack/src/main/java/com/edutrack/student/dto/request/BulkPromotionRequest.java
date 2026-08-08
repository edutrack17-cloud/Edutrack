package com.edutrack.student.dto.request;

import java.util.List;

public record BulkPromotionRequest(
   List<Long> studentIds,
   int targetSectionId
) {}

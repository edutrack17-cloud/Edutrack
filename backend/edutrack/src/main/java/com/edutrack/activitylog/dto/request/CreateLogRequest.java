package com.edutrack.activitylog.dto.request;

import jakarta.persistence.Column;

public record CreateLogRequest(
   String logHeader,

   @Column(columnDefinition = "TEXT")
   String logDescription
) {}

package com.edutrack.activitylog.dto.response;

import jakarta.persistence.Column;

import java.time.LocalDateTime;

public record ActivityLogResponse(
   Long logId,
   String logHeader,
   @Column(columnDefinition = "TEXT")
   String logDescription,
   LocalDateTime createdAt,
   Long userId
) {}

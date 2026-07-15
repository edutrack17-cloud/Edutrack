package com.edutrack.shared.response;

import java.time.LocalDateTime;

public record ErrorResponse(
   LocalDateTime timestamp,
   int status,
   String error,
   String message,
   String path
) {}

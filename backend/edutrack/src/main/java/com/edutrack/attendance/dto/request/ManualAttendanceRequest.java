package com.edutrack.attendance.dto.request;

import java.time.LocalDateTime;

public record ManualAttendanceRequest(
   LocalDateTime dateTimeIn
) {}

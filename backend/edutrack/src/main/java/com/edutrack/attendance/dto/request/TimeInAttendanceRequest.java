package com.edutrack.attendance.dto.request;

import jakarta.validation.constraints.NotBlank;

public record TimeInAttendanceRequest(
   @NotBlank
   String rfid
) {}

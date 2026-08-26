package com.edutrack.attendance.dto.request;

import jakarta.validation.constraints.NotBlank;

public record TimeInAndOutAttendanceRequest(
   @NotBlank
   String rfid
) {}

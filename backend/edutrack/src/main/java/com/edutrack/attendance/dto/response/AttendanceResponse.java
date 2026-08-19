package com.edutrack.attendance.dto.response;

import com.edutrack.attendance.enums.AttendanceStatus;
import com.edutrack.section.enums.GradeLevel;

import java.time.LocalDateTime;

public record AttendanceResponse(
   Long attendanceId,
   String studentName,
   String gradeAndSection,
   LocalDateTime dateTimeIn,
   LocalDateTime dateTimeOut,
   AttendanceStatus attendanceStatus,
   boolean confirmed
) {}

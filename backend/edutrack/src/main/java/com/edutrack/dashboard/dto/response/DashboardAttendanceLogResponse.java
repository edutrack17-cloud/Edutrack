package com.edutrack.dashboard.dto.response;

import com.edutrack.attendance.enums.AttendanceStatus;

import java.time.LocalDateTime;

public record DashboardAttendanceLogResponse(
        String lrn, String studentName, String sectionName,
        LocalDateTime timeIn, LocalDateTime timeOut, AttendanceStatus status) {}
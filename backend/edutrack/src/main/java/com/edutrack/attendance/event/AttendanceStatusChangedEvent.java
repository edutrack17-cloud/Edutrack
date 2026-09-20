package com.edutrack.attendance.event;

import com.edutrack.attendance.enums.AttendanceStatus;

public record AttendanceStatusChangedEvent(
        Long studentId,
        AttendanceStatus status,
        NotificationType notificationType
) {
    public enum NotificationType {
        TIME_IN,
        TIME_OUT
    }
}
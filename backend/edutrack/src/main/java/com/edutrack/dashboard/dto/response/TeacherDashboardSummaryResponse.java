package com.edutrack.dashboard.dto.response;

public record TeacherDashboardSummaryResponse(
        long myStudents, long presentToday, long onSchoolToday,
        long absentToday, double attendanceRate, long incompleteAttendance)
{}
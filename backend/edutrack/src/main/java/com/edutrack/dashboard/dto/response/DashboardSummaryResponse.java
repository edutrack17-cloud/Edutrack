package com.edutrack.dashboard.dto.response;

public record DashboardSummaryResponse(
        long enrolledStudents, long activeTeachers, long activeSections,
        long presentToday, long onSchoolToday, long absentToday,
        long incompleteAttendance, double attendanceRate)
{}

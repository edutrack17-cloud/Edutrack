package com.edutrack.dashboard.dto.response;

import java.util.List;

public record TeacherDashboardResponse(
        TeacherDashboardSummaryResponse summary,
        List<AttendanceOverviewPointResponse> attendanceOverview,
        List<DashboardAttendanceLogResponse> todayAttendance,
        List<SectionSummaryResponse> mySections,
        Integer selectedSectionId) {}
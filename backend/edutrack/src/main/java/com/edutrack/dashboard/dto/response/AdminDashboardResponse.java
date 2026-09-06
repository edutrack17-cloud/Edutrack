package com.edutrack.dashboard.dto.response;

import java.util.List;

public record AdminDashboardResponse(
        DashboardSummaryResponse summary,
        List<AttendanceOverviewPointResponse> attendanceOverview,
        List<DashboardAttendanceLogResponse> recentAttendance) {}

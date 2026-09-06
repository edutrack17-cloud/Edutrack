package com.edutrack.dashboard.controller;

import com.edutrack.dashboard.dto.response.AdminDashboardResponse;
import com.edutrack.dashboard.dto.response.TeacherDashboardResponse;
import com.edutrack.dashboard.enums.DashboardPeriod;
import com.edutrack.dashboard.service.DashboardService;
import com.edutrack.security.CustomUserDetails; // adjust to your actual package
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public AdminDashboardResponse getAdminDashboard(
            @RequestParam(defaultValue = "daily") DashboardPeriod period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return dashboardService.getAdminDashboard(period, date);
    }

    @GetMapping("/teacher")
    @PreAuthorize("hasRole('TEACHER')")
    public TeacherDashboardResponse getTeacherDashboard(
            @RequestParam(defaultValue = "daily") DashboardPeriod period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Authentication authentication) {
        return dashboardService.getTeacherDashboard(period, date, authentication.getName());
    }
}
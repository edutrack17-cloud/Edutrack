package com.edutrack.activitylog.controller;

import com.edutrack.activitylog.dto.response.ActivityLogResponse;
import com.edutrack.activitylog.service.ActivityLogService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("api/activity-log")
public class ActivityLogController {
    private final ActivityLogService activityLogService;

    public ActivityLogController(ActivityLogService activityLogService) {
        this.activityLogService = activityLogService;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<Page<ActivityLogResponse>> getActivityLogs(Pageable pageable, @RequestParam(required = false) String logHeader){
        return ResponseEntity.ok(activityLogService.getLogs(pageable, logHeader));
    }

    /**
     * Distinct log headers, for populating the filter dropdown.
     *
     * Separate from GET /api/activity-log so the dropdown can be loaded once
     * on page mount without dragging along a page of log rows.
     *
     * Same ADMIN-only guard as the list endpoint — if a GUARD or TEACHER
     * ever needs to see the activity log, relax both endpoints together,
     * not just this one.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/headers")
    public ResponseEntity<List<String>> getLogHeaders(){
        return ResponseEntity.ok(activityLogService.getLogHeaders());
    }
}
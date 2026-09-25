package com.edutrack.attendance.controller;

import com.edutrack.attendance.dto.request.ManualAttendanceRequest;
import com.edutrack.attendance.dto.request.TimeInAndOutAttendanceRequest;
import com.edutrack.attendance.dto.response.AttendanceResponse;
import com.edutrack.attendance.enums.AttendanceStatus;
import com.edutrack.attendance.service.AttendanceService;
import com.edutrack.section.enums.GradeLevel;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    //CREATE
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'GUARD')")
    @PostMapping
    public ResponseEntity<AttendanceResponse> createAttendance(
            @Valid @RequestBody TimeInAndOutAttendanceRequest request) {
        return ResponseEntity.ok(attendanceService.createAttendance(request));
    }

    //READ
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'GUARD')")
    @GetMapping
    public ResponseEntity<Page<AttendanceResponse>> getAttendance(
            @RequestParam(required = false) GradeLevel gradeLevel,
            @RequestParam(required = false) AttendanceStatus attendanceStatus,
            Pageable pageable) {
        return ResponseEntity.ok(attendanceService.getAttendance(gradeLevel, attendanceStatus, pageable));
    }

    //MANUAL ATTENDANCE
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PostMapping("manual/{studentId}")
    public ResponseEntity<AttendanceResponse> manualAttendance(
            @PathVariable Long studentId,
            @RequestBody ManualAttendanceRequest request) {
        return ResponseEntity.ok(attendanceService.manualAttendance(studentId, request));
    }

    //MANUAL TIME-OUT
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PatchMapping("manual-timeout/{studentId}")
    public ResponseEntity<AttendanceResponse> manualTimeOut(@PathVariable Long studentId) {
        return ResponseEntity.ok(attendanceService.manualTimeOut(studentId));
    }

    //MARK AS PRESENT
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PatchMapping("present")
    public ResponseEntity<AttendanceResponse> markAsPresent(
            @Valid @RequestBody TimeInAndOutAttendanceRequest request) {
        return ResponseEntity.ok(attendanceService.markAsPresent(request));
    }

    //TIME-OUT
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'GUARD')")
    @PatchMapping("time-out")
    public ResponseEntity<AttendanceResponse> timeOut(
            @Valid @RequestBody TimeInAndOutAttendanceRequest request) {
        return ResponseEntity.ok(attendanceService.timeOut(request));
    }

    //MULTIPLE ABSENT
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PostMapping("close-attendance")
    public ResponseEntity<List<AttendanceResponse>> bulkMarkAsAbsent(
            @RequestParam String sectionName) {
        return ResponseEntity.ok(attendanceService.bulkMarkAsAbsent(sectionName));
    }
}
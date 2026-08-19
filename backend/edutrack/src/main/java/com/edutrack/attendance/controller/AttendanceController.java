package com.edutrack.attendance.controller;

import com.edutrack.attendance.dto.request.TimeInAttendanceRequest;
import com.edutrack.attendance.dto.response.AttendanceResponse;
import com.edutrack.attendance.service.AttendanceService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/attendance")
public class AttendanceController {
    private AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    //CREATE
    @PostMapping
    public ResponseEntity<AttendanceResponse> createAttendance(@Valid @RequestBody TimeInAttendanceRequest request){
        AttendanceResponse savedAttendance = attendanceService.createAttendance(request);
        return ResponseEntity.ok(savedAttendance);
    }

    //CONFIRM ATTENDANCE
    @PatchMapping("confirm")
    public ResponseEntity<AttendanceResponse> confirmAttendance(@Valid @RequestBody TimeInAttendanceRequest request){
        AttendanceResponse confirmedAttendance = attendanceService.confirmAttendance(request);
        return ResponseEntity.ok(confirmedAttendance);
    }
}

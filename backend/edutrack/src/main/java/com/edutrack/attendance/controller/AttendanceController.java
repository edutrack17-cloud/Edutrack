package com.edutrack.attendance.controller;

import com.edutrack.attendance.dto.request.ManualAttendanceRequest;
import com.edutrack.attendance.dto.request.TimeInAndOutAttendanceRequest;
import com.edutrack.attendance.dto.response.AttendanceResponse;
import com.edutrack.attendance.entity.Attendance;
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
    public ResponseEntity<AttendanceResponse> createAttendance(@Valid @RequestBody TimeInAndOutAttendanceRequest request){
        AttendanceResponse savedAttendance = attendanceService.createAttendance(request);
        return ResponseEntity.ok(savedAttendance);
    }

    //MANUAL ATTENDANCE
    @PostMapping("manual/{studentId}")
    public ResponseEntity<AttendanceResponse> manualAttendance(@PathVariable Long studentId, @RequestBody ManualAttendanceRequest request){
        AttendanceResponse savedManualAttendance = attendanceService.manualAttendance(studentId, request);
        return ResponseEntity.ok(savedManualAttendance);
    }

    //MANUAL TIME-OUT
    @PatchMapping("manual-timeout/{studentId}")
    public ResponseEntity<AttendanceResponse> manualTimeOut(@PathVariable Long studentId){
        AttendanceResponse savedTimedOutAttendance = attendanceService.manualTimeOut(studentId);
        return ResponseEntity.ok(savedTimedOutAttendance);
    }

    //MARK AS PRESENT
    @PatchMapping("present")
    public ResponseEntity<AttendanceResponse> markAsPresent(@Valid @RequestBody TimeInAndOutAttendanceRequest request){
        AttendanceResponse confirmedAttendance = attendanceService.markAsPresent(request);
        return ResponseEntity.ok(confirmedAttendance);
    }

    //TIME-OUT
    @PatchMapping("time-out")
    public ResponseEntity<AttendanceResponse> timeOut(@Valid @RequestBody TimeInAndOutAttendanceRequest request){
        AttendanceResponse timedOutAttendance = attendanceService.timeOut(request);
        return ResponseEntity.ok(timedOutAttendance);
    }
}

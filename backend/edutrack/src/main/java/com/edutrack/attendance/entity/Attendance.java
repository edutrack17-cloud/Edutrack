package com.edutrack.attendance.entity;

import com.edutrack.attendance.enums.AttendanceStatus;
import com.edutrack.student.entity.Student;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance")
public class Attendance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long attendanceId;

    @ManyToOne
    @JoinColumn(name = "assignment_id", nullable = false)
    private StudentSectionAssignment studentSectionAssignment;

    private LocalDateTime dateTimeIn;

    private LocalDateTime dateTimeOut;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttendanceStatus attendanceStatus;

    /**
     * The calendar date this attendance record represents.
     *
     * FIX: Removed `= LocalDate.now()` default. Callers MUST set this
     * explicitly to the intended school day. The old default caused records
     * to silently collapse onto the insert date when callers forgot to set it,
     * which is why SF2 report generation only showed one month of data.
     */
    @Column(name = "created_at", nullable = false)
    private LocalDate createdAt;

    public long getAttendanceId() {
        return attendanceId;
    }

    public void setAttendanceId(long attendanceId) {
        this.attendanceId = attendanceId;
    }

    public StudentSectionAssignment getStudentSectionAssignment() {
        return studentSectionAssignment;
    }

    public void setStudentSectionAssignment(StudentSectionAssignment studentSectionAssignment) {
        this.studentSectionAssignment = studentSectionAssignment;
    }

    public LocalDateTime getDateTimeIn() {
        return dateTimeIn;
    }

    public void setDateTimeIn(LocalDateTime dateTimeIn) {
        this.dateTimeIn = dateTimeIn;
    }

    public LocalDateTime getDateTimeOut() {
        return dateTimeOut;
    }

    public void setDateTimeOut(LocalDateTime dateTimeOut) {
        this.dateTimeOut = dateTimeOut;
    }

    public AttendanceStatus getAttendanceStatus() {
        return attendanceStatus;
    }

    public void setAttendanceStatus(AttendanceStatus attendanceStatus) {
        this.attendanceStatus = attendanceStatus;
    }

    public LocalDate getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDate createdAt) {
        this.createdAt = createdAt;
    }
}
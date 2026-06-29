package com.edutrack.attendance;

import com.edutrack.student.Student;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

@Entity
@Table(name = "attendance")
public class Attendance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long attendanceId;

    @ManyToOne
    @JoinColumn(name = "studentId", nullable = false)
    private Student student;

    @Column(nullable = false)
    private LocalDateTime datetimeIn;

    private LocalDateTime datetimeOut;

    @Enumerated(EnumType.STRING)
    private AttendanceStatus attendanceStatus;

    @Column(nullable = false)
    private boolean isConfirmed;

    public long getAttendanceId() {
        return attendanceId;
    }

    public void setAttendanceId(long attendanceId) {
        this.attendanceId = attendanceId;
    }

    public Student getStudent() {
        return student;
    }

    public void setStudent(Student student) {
        this.student = student;
    }

    public LocalDateTime getDatetimeIn() {
        return datetimeIn;
    }

    public void setDatetimeIn(LocalDateTime datetimeIn) {
        this.datetimeIn = datetimeIn;
    }

    public LocalDateTime getDatetimeOut() {
        return datetimeOut;
    }

    public void setDatetimeOut(LocalDateTime datetimeOut) {
        this.datetimeOut = datetimeOut;
    }

    public AttendanceStatus getAttendanceStatus() {
        return attendanceStatus;
    }

    public void setAttendanceStatus(AttendanceStatus attendanceStatus) {
        this.attendanceStatus = attendanceStatus;
    }

    public boolean isConfirmed() {
        return isConfirmed;
    }

    public void setConfirmed(boolean confirmed) {
        isConfirmed = confirmed;
    }
}

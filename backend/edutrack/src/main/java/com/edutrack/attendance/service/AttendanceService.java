package com.edutrack.attendance.service;

import com.edutrack.attendance.dto.request.TimeInAttendanceRequest;
import com.edutrack.attendance.dto.response.AttendanceResponse;
import com.edutrack.attendance.entity.Attendance;
import com.edutrack.attendance.enums.AttendanceStatus;
import com.edutrack.attendance.exception.AlreadyHasARecord;
import com.edutrack.attendance.exception.AssignmentNotFound;
import com.edutrack.attendance.mapper.AttendanceMapper;
import com.edutrack.attendance.repository.AttendanceRepository;
import com.edutrack.attendance.specification.AttendanceSpecification;
import com.edutrack.student.entity.Student;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import com.edutrack.studentsectionassignment.exception.SectionAssignmentNotFound;
import com.edutrack.studentsectionassignment.repository.StudentSectionAssignmentRepository;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@Transactional(readOnly = true)
public class AttendanceService {
    private AttendanceRepository attendanceRepository;
    private AttendanceMapper attendanceMapper;
    private StudentSectionAssignmentRepository studentSectionAssignmentRepository;

    public AttendanceService(AttendanceRepository attendanceRepository,
                             AttendanceMapper attendanceMapper,
                             StudentSectionAssignmentRepository studentSectionAssignmentRepository) {
        this.attendanceRepository = attendanceRepository;
        this.attendanceMapper = attendanceMapper;
        this.studentSectionAssignmentRepository = studentSectionAssignmentRepository;
    }


    //CREATE
    @Transactional
    public AttendanceResponse createAttendance(TimeInAttendanceRequest timeInAttendanceRequest){

        LocalDate today = LocalDate.now();

        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime startOfNextDay = today.plusDays(1).atStartOfDay();

        StudentSectionAssignment studentToTimeIn = studentSectionAssignmentRepository.
                findByStudent_RfidAndLeftAtIsNull(timeInAttendanceRequest.rfid())
                .orElseThrow(AssignmentNotFound::new);

        Specification<Attendance> filters = Specification
                .where(AttendanceSpecification.hasAssignment(studentToTimeIn.getAssignmentId()))
                .and(AttendanceSpecification.timeInBetween(
                   startOfDay,
                   startOfNextDay
                ));

        if (attendanceRepository.exists(filters)){
            throw new AlreadyHasARecord();
        }


        Attendance newAttendance = new Attendance();

        newAttendance.setStudentSectionAssignment(studentToTimeIn);
        newAttendance.setDateTimeIn(LocalDateTime.now());
        newAttendance.setAttendanceStatus(AttendanceStatus.present);
        newAttendance.setConfirmed(false);

        Attendance savedAttendance = attendanceRepository.save(newAttendance);
        return attendanceMapper.toAttendanceResponseDTO(savedAttendance);
    }


}

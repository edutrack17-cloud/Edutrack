package com.edutrack.attendance.service;

import com.edutrack.attendance.dto.request.TimeInAndOutAttendanceRequest;
import com.edutrack.attendance.dto.response.AttendanceResponse;
import com.edutrack.attendance.entity.Attendance;
import com.edutrack.attendance.enums.AttendanceStatus;
import com.edutrack.attendance.exception.*;
import com.edutrack.attendance.mapper.AttendanceMapper;
import com.edutrack.attendance.repository.AttendanceRepository;
import com.edutrack.attendance.specification.AttendanceSpecification;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
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


    LocalDate today = LocalDate.now();

    LocalDateTime startOfDay = today.atStartOfDay();
    LocalDateTime startOfNextDay = today.plusDays(1).atStartOfDay();


    //TIME-IN
    @Transactional
    public AttendanceResponse createAttendance(TimeInAndOutAttendanceRequest timeInAndOutAttendanceRequest){


        StudentSectionAssignment studentToTimeIn = studentSectionAssignmentRepository.
                findByStudent_RfidAndLeftAtIsNull(timeInAndOutAttendanceRequest.rfid())
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
        newAttendance.setAttendanceStatus(AttendanceStatus.on_school);

        Attendance savedAttendance = attendanceRepository.save(newAttendance);
        return attendanceMapper.toAttendanceResponseDTO(savedAttendance);
    }

//    //MANUAL ATTENDANCE
//    @Transactional
//    public AttendanceResponse manualAttendance(Long studentId, ){
//
//    }

    //MARK AS PRESENT
    @Transactional
    public AttendanceResponse markAsPresent(TimeInAndOutAttendanceRequest timeInAndOutAttendanceRequest){
        StudentSectionAssignment studentToMarkPresent = studentSectionAssignmentRepository
                .findByStudent_RfidAndLeftAtIsNull(timeInAndOutAttendanceRequest.rfid())
                .orElseThrow(AssignmentNotFound::new);

        Specification<Attendance> filters = Specification
                .where(AttendanceSpecification.hasAssignment(studentToMarkPresent.getAssignmentId()))
                .and(AttendanceSpecification.timeInBetween(startOfDay, startOfNextDay));

        Attendance attendanceToMarkPresent = attendanceRepository
                .findOne(filters)
                .orElseThrow(AttendanceNotFound::new);

        if (attendanceToMarkPresent.getAttendanceStatus() == AttendanceStatus.present){
            throw new AlreadyMarkedPresent();
        }

        attendanceToMarkPresent.setAttendanceStatus(AttendanceStatus.present);
        Attendance markedPresentAttendance = attendanceRepository.save(attendanceToMarkPresent);
        return attendanceMapper.toAttendanceResponseDTO(markedPresentAttendance);
    }

    //TIME-OUT
    @Transactional
    public AttendanceResponse timeOut(TimeInAndOutAttendanceRequest request){
        StudentSectionAssignment studentToTimeOut = studentSectionAssignmentRepository
                .findByStudent_RfidAndLeftAtIsNull(request.rfid())
                .orElseThrow(AssignmentNotFound::new);

        Specification<Attendance> filters = Specification
                .where(AttendanceSpecification.hasAssignment(studentToTimeOut.getAssignmentId()))
                .and(AttendanceSpecification.timeInBetween(startOfDay, startOfNextDay));

        Attendance attendanceToTimeOut = attendanceRepository
                .findOne(filters)
                .orElseThrow(AttendanceNotFound::new);

        if (attendanceToTimeOut.getAttendanceStatus() == AttendanceStatus.on_school){
            throw new NoClassromTap();
        }

        if (attendanceToTimeOut.getDateTimeOut() != null){
            throw new AlreadyTimedOut();
        }

        attendanceToTimeOut.setDateTimeOut(LocalDateTime.now());
        Attendance timedOutAttendance = attendanceRepository.save(attendanceToTimeOut);
        return attendanceMapper.toAttendanceResponseDTO(timedOutAttendance);
    }


}

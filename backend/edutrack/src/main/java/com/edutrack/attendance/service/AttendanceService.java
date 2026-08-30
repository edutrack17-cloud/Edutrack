package com.edutrack.attendance.service;

import com.edutrack.attendance.dto.request.ManualAttendanceRequest;
import com.edutrack.attendance.dto.request.TimeInAndOutAttendanceRequest;
import com.edutrack.attendance.dto.response.AttendanceResponse;
import com.edutrack.attendance.entity.Attendance;
import com.edutrack.attendance.enums.AttendanceStatus;
import com.edutrack.attendance.exception.*;
import com.edutrack.attendance.mapper.AttendanceMapper;
import com.edutrack.attendance.repository.AttendanceRepository;
import com.edutrack.attendance.specification.AttendanceSpecification;
import com.edutrack.student.mapper.StudentMapper;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import com.edutrack.studentsectionassignment.repository.StudentSectionAssignmentRepository;
import com.edutrack.studentsectionassignment.specification.StudentSectionAssignmentSpecification;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AttendanceService {
    private final StudentMapper studentMapper;
    private AttendanceRepository attendanceRepository;
    private AttendanceMapper attendanceMapper;
    private StudentSectionAssignmentRepository studentSectionAssignmentRepository;

    public AttendanceService(AttendanceRepository attendanceRepository,
                             AttendanceMapper attendanceMapper,
                             StudentSectionAssignmentRepository studentSectionAssignmentRepository, StudentMapper studentMapper) {
        this.attendanceRepository = attendanceRepository;
        this.attendanceMapper = attendanceMapper;
        this.studentSectionAssignmentRepository = studentSectionAssignmentRepository;
        this.studentMapper = studentMapper;
    }

    private StudentSectionAssignment findAssignmentByStudentId(Long studentId){
        return studentSectionAssignmentRepository
                .findByStudent_StudentIdAndLeftAtIsNull(studentId)
                .orElseThrow(AssignmentNotFound::new);
    }

    private Specification<Attendance> filterByAssignmentIdAndDateTime(Long assignmentId, LocalDate today){
        return Specification
                .where(AttendanceSpecification.hasAssignment(assignmentId))
                .and(AttendanceSpecification.createdToday(today));
    }

    private Attendance findByAssignmentAndDateTime(Specification<Attendance> filters){
        return attendanceRepository
                .findOne(filters)
                .orElseThrow(AssignmentNotFound::new);
    }

    //TIME-IN
    @Transactional
    public AttendanceResponse createAttendance(TimeInAndOutAttendanceRequest timeInAndOutAttendanceRequest){
        LocalDate today = LocalDate.now();

        StudentSectionAssignment studentToTimeIn = studentSectionAssignmentRepository.
                findByStudent_RfidAndLeftAtIsNull(timeInAndOutAttendanceRequest.rfid())
                .orElseThrow(AssignmentNotFound::new);

        Specification<Attendance> filters = filterByAssignmentIdAndDateTime(
                studentToTimeIn.getAssignmentId(), today);

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

    //MANUAL ATTENDANCE
    @Transactional
    public AttendanceResponse manualAttendance(Long studentId, ManualAttendanceRequest manualAttendanceRequest){
        LocalDate today = LocalDate.now();

        StudentSectionAssignment studentToTimeIn = findAssignmentByStudentId(studentId);

        Attendance manualAttendance = new Attendance();
        manualAttendance.setAttendanceStatus(AttendanceStatus.present);
        manualAttendance.setDateTimeIn(manualAttendanceRequest.dateTimeIn());
        manualAttendance.setStudentSectionAssignment(studentToTimeIn);

        Specification<Attendance> filters = filterByAssignmentIdAndDateTime(
                studentToTimeIn.getAssignmentId(), today);

        if (attendanceRepository.exists(filters)){
            throw new AlreadyHasARecord();
        }

        Attendance savedAttendance = attendanceRepository.save(manualAttendance);
        return attendanceMapper.toAttendanceResponseDTO(savedAttendance);
    }

    //MANUAL TIME-OUT
    @Transactional
    public AttendanceResponse manualTimeOut(Long studentId){
        LocalDate today = LocalDate.now();

        StudentSectionAssignment studentToTimeOut = findAssignmentByStudentId(studentId);

        Specification<Attendance> filters = filterByAssignmentIdAndDateTime(
                studentToTimeOut.getAssignmentId(), today);

        Attendance attendanceToTimeOUt = findByAssignmentAndDateTime(filters);

        if (attendanceToTimeOUt.getAttendanceStatus() == AttendanceStatus.on_school){
            throw new NoClassromTap();
        }

        if (attendanceToTimeOUt.getDateTimeOut() != null){
            throw new AlreadyTimedOut();
        }

        attendanceToTimeOUt.setDateTimeOut(LocalDateTime.now());
        Attendance savedTimeOutAttendance = attendanceRepository.save(attendanceToTimeOUt);
        return attendanceMapper.toAttendanceResponseDTO(savedTimeOutAttendance);
    }

    //MARK AS PRESENT
    @Transactional
    public AttendanceResponse markAsPresent(TimeInAndOutAttendanceRequest timeInAndOutAttendanceRequest){
        LocalDate today = LocalDate.now();

        StudentSectionAssignment studentToMarkPresent = studentSectionAssignmentRepository
                .findByStudent_RfidAndLeftAtIsNull(timeInAndOutAttendanceRequest.rfid())
                .orElseThrow(AssignmentNotFound::new);

        Specification<Attendance> filters = filterByAssignmentIdAndDateTime(
                studentToMarkPresent.getAssignmentId(), today);

        Attendance attendanceToMarkPresent = findByAssignmentAndDateTime(filters);

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
        LocalDate today = LocalDate.now();

        StudentSectionAssignment studentToTimeOut = studentSectionAssignmentRepository
                .findByStudent_RfidAndLeftAtIsNull(request.rfid())
                .orElseThrow(AssignmentNotFound::new);

        Specification<Attendance> filters = filterByAssignmentIdAndDateTime(
                studentToTimeOut.getAssignmentId(), today);

        Attendance attendanceToTimeOut = findByAssignmentAndDateTime(filters);

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

    //MULTIPLE ABSENT
    @Transactional
    public List<AttendanceResponse> bulkMarkAsAbsent(String sectionName){
        LocalDate today = LocalDate.now();

        Specification<StudentSectionAssignment> studentSectionAssignmentFilter = Specification
                .where(StudentSectionAssignmentSpecification.hasSection(sectionName))
                .and(StudentSectionAssignmentSpecification.isCurrent());

        List<StudentSectionAssignment> listOfStudents = studentSectionAssignmentRepository
                .findAll(studentSectionAssignmentFilter);

        List<Long> assignmentIds = listOfStudents.stream()
                .map(StudentSectionAssignment::getAssignmentId)
                .toList();

        if (assignmentIds.isEmpty()) return List.of();

        Specification<Attendance> attendanceFilter = Specification
                .where(AttendanceSpecification.hasAssignmentIn(assignmentIds))
                .and(AttendanceSpecification.createdToday(today));

        List<Attendance> studentsWithExistingAttendance =
                attendanceRepository.findAll(attendanceFilter);

        Set<Long> assignmentIdsWithAttendance = studentsWithExistingAttendance.stream()
                .map(a -> a.getStudentSectionAssignment().getAssignmentId())
                .collect(Collectors.toSet());

        List<StudentSectionAssignment> absentStudents = listOfStudents.stream()
                .filter(s -> !assignmentIdsWithAttendance.contains(s.getAssignmentId()))
                .toList();

        List<Attendance> absentRecords = absentStudents.stream()
                .map(assignment -> {
                    Attendance absentAttendanceRecord = new Attendance();
                    absentAttendanceRecord.setAttendanceStatus(AttendanceStatus.absent);
                    absentAttendanceRecord.setStudentSectionAssignment(assignment);
                    return absentAttendanceRecord;
                })
                .toList();

        List<Attendance> savedAbsentRecords = attendanceRepository.saveAll(absentRecords);

        return savedAbsentRecords.stream()
                .map(attendanceMapper::toAttendanceResponseDTO)
                .toList();
    }
}
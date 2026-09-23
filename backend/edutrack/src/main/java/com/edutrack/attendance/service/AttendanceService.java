package com.edutrack.attendance.service;

import com.edutrack.activitylog.service.ActivityLogService;
import com.edutrack.attendance.dto.request.ManualAttendanceRequest;
import com.edutrack.attendance.dto.request.TimeInAndOutAttendanceRequest;
import com.edutrack.attendance.dto.response.AttendanceResponse;
import com.edutrack.attendance.entity.Attendance;
import com.edutrack.attendance.enums.AttendanceStatus;
import com.edutrack.attendance.event.AttendanceStatusChangedEvent;
import com.edutrack.attendance.exception.*;
import com.edutrack.attendance.mapper.AttendanceMapper;
import com.edutrack.attendance.repository.AttendanceRepository;
import com.edutrack.attendance.specification.AttendanceSpecification;
import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.enums.SectionStatus;
import com.edutrack.security.CurrentUserProvider;
import com.edutrack.shared.util.NameUtil;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import com.edutrack.studentsectionassignment.repository.StudentSectionAssignmentRepository;
import com.edutrack.studentsectionassignment.specification.StudentSectionAssignmentSpecification;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@Transactional(readOnly = true)
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final AttendanceMapper attendanceMapper;
    private final StudentSectionAssignmentRepository studentSectionAssignmentRepository;
    private final ActivityLogService activityLogService;
    private final CurrentUserProvider currentUserProvider;
    private final ApplicationEventPublisher eventPublisher;

    public AttendanceService(AttendanceRepository attendanceRepository,
                             AttendanceMapper attendanceMapper,
                             StudentSectionAssignmentRepository studentSectionAssignmentRepository,
                             ActivityLogService activityLogService,
                             CurrentUserProvider currentUserProvider,
                             ApplicationEventPublisher eventPublisher) {
        this.attendanceRepository = attendanceRepository;
        this.attendanceMapper = attendanceMapper;
        this.studentSectionAssignmentRepository = studentSectionAssignmentRepository;
        this.activityLogService = activityLogService;
        this.currentUserProvider = currentUserProvider;
        this.eventPublisher = eventPublisher;
    }

    private StudentSectionAssignment findAssignmentByStudentId(Long studentId) {
        return studentSectionAssignmentRepository
                .findByStudent_StudentIdAndLeftAtIsNull(studentId)
                .orElseThrow(AssignmentNotFound::new);
    }

    private Specification<Attendance> filterByAssignmentIdAndDateTime(Long assignmentId, LocalDate today) {
        return Specification
                .where(AttendanceSpecification.hasAssignment(assignmentId))
                .and(AttendanceSpecification.createdToday(today));
    }

    private Attendance findByAssignmentAndDateTime(Specification<Attendance> filters) {
        return attendanceRepository
                .findOne(filters)
                .orElseThrow(AssignmentNotFound::new);
    }

    //TIME-IN
    @Transactional
    public AttendanceResponse createAttendance(TimeInAndOutAttendanceRequest timeInAndOutAttendanceRequest) {
        LocalDate today = LocalDate.now();

        StudentSectionAssignment studentToTimeIn = studentSectionAssignmentRepository
                .findByStudent_RfidAndLeftAtIsNull(timeInAndOutAttendanceRequest.rfid())
                .orElseThrow(AssignmentNotFound::new);

        Specification<Attendance> filters = filterByAssignmentIdAndDateTime(
                studentToTimeIn.getAssignmentId(), today);

        if (attendanceRepository.exists(filters)) {
            throw new AlreadyHasARecord();
        }

        Attendance newAttendance = new Attendance();
        newAttendance.setStudentSectionAssignment(studentToTimeIn);
        newAttendance.setDateTimeIn(LocalDateTime.now());
        newAttendance.setAttendanceStatus(AttendanceStatus.on_school);

        Attendance savedAttendance = attendanceRepository.save(newAttendance);

        eventPublisher.publishEvent(new AttendanceStatusChangedEvent(
                studentToTimeIn.getStudent().getStudentId(),
                AttendanceStatus.on_school,
                AttendanceStatusChangedEvent.NotificationType.TIME_IN
        ));

        return attendanceMapper.toAttendanceResponseDTO(savedAttendance);
    }

    //READ
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'GUARD')")
    public Page<AttendanceResponse> getAttendance(GradeLevel gradeLevel, Pageable pageable) {

        Specification<Attendance> spec = Specification
                .where(AttendanceSpecification.schoolYearIsNotClosed())
                .and(AttendanceSpecification.studentIsEnrolled())
                .and(AttendanceSpecification.hasGradeLevel(gradeLevel));

        if (currentUserProvider.isTeacher()) {
            spec = spec.and(AttendanceSpecification.isAdvisedBy(
                    currentUserProvider.getCurrentUserId(),
                    SectionStatus.active
            ));
        }

        Pageable sorted = pageable.getSort().isSorted()
                ? pageable
                : PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "attendanceId")
        );

        return attendanceRepository.findAll(spec, sorted)
                .map(attendanceMapper::toAttendanceResponseDTO);
    }

    //MANUAL ATTENDANCE
    @PreAuthorize("hasRole('ADMIN') or (hasRole('TEACHER') and @studentAccessService.isAdviserOfStudent(#studentId))")
    @Transactional
    public AttendanceResponse manualAttendance(Long studentId, ManualAttendanceRequest manualAttendanceRequest) {
        LocalDate today = LocalDate.now();

        StudentSectionAssignment studentToTimeIn = findAssignmentByStudentId(studentId);

        Attendance manualAttendance = new Attendance();
        manualAttendance.setAttendanceStatus(AttendanceStatus.present);
        manualAttendance.setDateTimeIn(manualAttendanceRequest.dateTimeIn());
        manualAttendance.setStudentSectionAssignment(studentToTimeIn);

        Specification<Attendance> filters = filterByAssignmentIdAndDateTime(
                studentToTimeIn.getAssignmentId(), today);

        if (attendanceRepository.exists(filters)) {
            throw new AlreadyHasARecord();
        }

        Attendance savedAttendance = attendanceRepository.save(manualAttendance);

        activityLogService.createLogRecord(
                "MANUAL ATTENDANCE",
                "manually marked Student " +
                        NameUtil.buildFullName(studentToTimeIn.getStudent().getFirstName(),
                                studentToTimeIn.getStudent().getMiddleName(),
                                studentToTimeIn.getStudent().getLastName()) +
                        " as present"
        );

        eventPublisher.publishEvent(new AttendanceStatusChangedEvent(
                studentToTimeIn.getStudent().getStudentId(),
                AttendanceStatus.present,
                AttendanceStatusChangedEvent.NotificationType.TIME_IN
        ));

        return attendanceMapper.toAttendanceResponseDTO(savedAttendance);
    }

    //MANUAL TIME-OUT
    @PreAuthorize("hasRole('ADMIN') or (hasRole('TEACHER') and @studentAccessService.isAdviserOfStudent(#studentId))")
    @Transactional
    public AttendanceResponse manualTimeOut(Long studentId) {
        LocalDate today = LocalDate.now();

        StudentSectionAssignment studentToTimeOut = findAssignmentByStudentId(studentId);

        Specification<Attendance> filters = filterByAssignmentIdAndDateTime(
                studentToTimeOut.getAssignmentId(), today);

        Attendance attendanceToTimeOUt = findByAssignmentAndDateTime(filters);

        if (attendanceToTimeOUt.getAttendanceStatus() == AttendanceStatus.on_school) {
            throw new NoClassromTap();
        }

        if (attendanceToTimeOUt.getDateTimeOut() != null) {
            throw new AlreadyTimedOut();
        }

        attendanceToTimeOUt.setDateTimeOut(LocalDateTime.now());
        Attendance savedTimeOutAttendance = attendanceRepository.save(attendanceToTimeOUt);

        activityLogService.createLogRecord(
                "MANUAL TIMEOUT",
                "manually closed the attendance record of Student " +
                        NameUtil.buildFullName(studentToTimeOut.getStudent().getFirstName(),
                                studentToTimeOut.getStudent().getMiddleName(),
                                studentToTimeOut.getStudent().getLastName())
        );

        eventPublisher.publishEvent(new AttendanceStatusChangedEvent(
                studentToTimeOut.getStudent().getStudentId(),
                savedTimeOutAttendance.getAttendanceStatus(),
                AttendanceStatusChangedEvent.NotificationType.TIME_OUT
        ));

        return attendanceMapper.toAttendanceResponseDTO(savedTimeOutAttendance);
    }

    //MARK AS PRESENT
    @PreAuthorize("hasRole('ADMIN') or (hasRole('TEACHER') and @studentAccessService.isAdviserOfStudentByRfid(#timeInAndOutAttendanceRequest.rfid()))")
    @Transactional
    public AttendanceResponse markAsPresent(TimeInAndOutAttendanceRequest timeInAndOutAttendanceRequest) {
        LocalDate today = LocalDate.now();

        StudentSectionAssignment studentToMarkPresent = studentSectionAssignmentRepository
                .findByStudent_RfidAndLeftAtIsNull(timeInAndOutAttendanceRequest.rfid())
                .orElseThrow(AssignmentNotFound::new);

        Specification<Attendance> filters = filterByAssignmentIdAndDateTime(
                studentToMarkPresent.getAssignmentId(), today);

        Attendance attendanceToMarkPresent = findByAssignmentAndDateTime(filters);

        if (attendanceToMarkPresent.getAttendanceStatus() == AttendanceStatus.absent) {
            throw new AlreadyMarkedAbsent();
        }

        if (attendanceToMarkPresent.getAttendanceStatus() == AttendanceStatus.present) {
            throw new AlreadyMarkedPresent();
        }

        attendanceToMarkPresent.setAttendanceStatus(AttendanceStatus.present);
        Attendance markedPresentAttendance = attendanceRepository.save(attendanceToMarkPresent);

        // NOTE: No SMS event is published here on purpose.
        // The parent already received an "arrived at school" notification when the student
        // tapped in at the gate (createAttendance) or was manually marked by a teacher
        // (manualAttendance). Marking as present is an in-system verification action,
        // not a new arrival, so it must NOT trigger another SMS.

        return attendanceMapper.toAttendanceResponseDTO(markedPresentAttendance);
    }

    //TIME-OUT
    @Transactional
    public AttendanceResponse timeOut(TimeInAndOutAttendanceRequest request) {
        LocalDate today = LocalDate.now();

        StudentSectionAssignment studentToTimeOut = studentSectionAssignmentRepository
                .findByStudent_RfidAndLeftAtIsNull(request.rfid())
                .orElseThrow(AssignmentNotFound::new);

        Specification<Attendance> filters = filterByAssignmentIdAndDateTime(
                studentToTimeOut.getAssignmentId(), today);

        Attendance attendanceToTimeOut = findByAssignmentAndDateTime(filters);

        if (attendanceToTimeOut.getAttendanceStatus() == AttendanceStatus.on_school) {
            throw new NoClassromTap();
        }

        if (attendanceToTimeOut.getDateTimeOut() != null) {
            throw new AlreadyTimedOut();
        }

        attendanceToTimeOut.setDateTimeOut(LocalDateTime.now());
        Attendance timedOutAttendance = attendanceRepository.save(attendanceToTimeOut);

        eventPublisher.publishEvent(new AttendanceStatusChangedEvent(
                studentToTimeOut.getStudent().getStudentId(),
                timedOutAttendance.getAttendanceStatus(),
                AttendanceStatusChangedEvent.NotificationType.TIME_OUT
        ));

        return attendanceMapper.toAttendanceResponseDTO(timedOutAttendance);
    }

    //MULTIPLE ABSENT
    @PreAuthorize("hasRole('ADMIN') or (hasRole('TEACHER') and @studentAccessService.isAdviserOfSectionName(#sectionName))")
    @Transactional
    public List<AttendanceResponse> bulkMarkAsAbsent(String sectionName) {
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

        List<Attendance> todaysAttendance = attendanceRepository.findAll(attendanceFilter);

        Map<Long, Attendance> attendanceByAssignmentId = todaysAttendance.stream()
                .collect(Collectors.toMap(
                        a -> a.getStudentSectionAssignment().getAssignmentId(),
                        a -> a));

        List<StudentSectionAssignment> noRecordStudents = listOfStudents.stream()
                .filter(s -> !attendanceByAssignmentId.containsKey(s.getAssignmentId()))
                .toList();

        List<Attendance> onSchoolOnlyRecords = attendanceByAssignmentId.values().stream()
                .filter(a -> a.getAttendanceStatus() == AttendanceStatus.on_school)
                .toList();

        if (noRecordStudents.isEmpty() && onSchoolOnlyRecords.isEmpty()) return List.of();

        List<Attendance> newAbsentRecords = noRecordStudents.stream()
                .map(assignment -> {
                    Attendance absentAttendanceRecord = new Attendance();
                    absentAttendanceRecord.setAttendanceStatus(AttendanceStatus.absent);
                    absentAttendanceRecord.setStudentSectionAssignment(assignment);
                    return absentAttendanceRecord;
                })
                .toList();

        onSchoolOnlyRecords.forEach(a -> a.setAttendanceStatus(AttendanceStatus.absent));

        List<Attendance> savedAbsentRecords = new ArrayList<>();
        if (!newAbsentRecords.isEmpty()) {
            savedAbsentRecords.addAll(attendanceRepository.saveAll(newAbsentRecords));
        }
        if (!onSchoolOnlyRecords.isEmpty()) {
            savedAbsentRecords.addAll(attendanceRepository.saveAll(onSchoolOnlyRecords));
        }

        String studentNames = Stream.concat(
                        noRecordStudents.stream().map(StudentSectionAssignment::getStudent),
                        onSchoolOnlyRecords.stream().map(a -> a.getStudentSectionAssignment().getStudent()))
                .map(student -> NameUtil.buildFullName(student.getFirstName(), student.getMiddleName(), student.getLastName()))
                .collect(Collectors.joining(", "));

        activityLogService.createLogRecord(
                "MARKED STUDENTS AS ABSENT",
                "marked Students: " + studentNames + " as absent in Section " + sectionName
        );

        return savedAbsentRecords.stream()
                .map(attendanceMapper::toAttendanceResponseDTO)
                .toList();
    }
}
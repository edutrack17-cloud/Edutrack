package com.edutrack.schoolform.service;

import com.edutrack.attendance.entity.Attendance;
import com.edutrack.attendance.enums.AttendanceStatus;
import com.edutrack.attendance.repository.AttendanceRepository;
import com.edutrack.schoolform.dto.request.SF2TableRequest;
import com.edutrack.schoolform.dto.response.SF2TableResponse;
import com.edutrack.schoolform.dto.response.StudentAttendanceRow;
import com.edutrack.schoolyear.entity.SchoolYear;
import com.edutrack.schoolyear.repository.SchoolYearRepository;
import com.edutrack.section.entity.Section;
import com.edutrack.section.exception.SectionNotFound;
import com.edutrack.section.repository.SectionRepository;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import com.edutrack.studentsectionassignment.repository.StudentSectionAssignmentRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class SF2TableService {

    private final SectionRepository sectionRepository;
    private final SchoolYearRepository schoolYearRepository;
    private final StudentSectionAssignmentRepository assignmentRepository;
    private final AttendanceRepository attendanceRepository;

    public SF2TableService(SectionRepository sectionRepository,
                           SchoolYearRepository schoolYearRepository,
                           StudentSectionAssignmentRepository assignmentRepository,
                           AttendanceRepository attendanceRepository) {
        this.sectionRepository = sectionRepository;
        this.schoolYearRepository = schoolYearRepository;
        this.assignmentRepository = assignmentRepository;
        this.attendanceRepository = attendanceRepository;
    }

    @PreAuthorize("hasRole('ADMIN') or (hasRole('TEACHER') and @studentAccessService.isAdviserOfSectionId(#request.sectionId()))")
    public SF2TableResponse getSF2TableData(SF2TableRequest request) {
        Section section = sectionRepository.findById(request.sectionId())
                .orElseThrow(() -> new SectionNotFound(request.sectionId()));

        SchoolYear schoolYear = schoolYearRepository.findById(request.schoolYearId())
                .orElseThrow(() -> new RuntimeException("School Year not found"));

        LocalDate periodStart = request.period().atDay(1);
        LocalDate periodEnd = request.period().atEndOfMonth();

        List<StudentSectionAssignment> roster = assignmentRepository
                .findRosterForSectionAndYear(request.sectionId(), schoolYear, periodStart, periodEnd);

        List<LocalDate> schoolDays = weekdaysInMonth(request.period());

        List<Long> assignmentIds = roster.stream()
                .map(StudentSectionAssignment::getAssignmentId)
                .toList();

        Map<Long, Map<LocalDate, AttendanceStatus>> attendanceByAssignment =
                loadAttendance(assignmentIds, periodStart, periodEnd);

        List<StudentAttendanceRow> studentRows = roster.stream()
                .map(assignment -> {
                    Map<LocalDate, String> attendanceMap = new HashMap<>();
                    Map<LocalDate, AttendanceStatus> studentAttendance = attendanceByAssignment
                            .getOrDefault(assignment.getAssignmentId(), Map.of());

                    for (LocalDate day : schoolDays) {
                        AttendanceStatus status = studentAttendance.get(day);
                        String mark = toSf2Mark(status);
                        if (mark != null) {
                            attendanceMap.put(day, mark);
                        }
                    }
                    return new StudentAttendanceRow(
                            assignment.getStudent().getStudentId(),
                            formatStudentName(assignment),
                            assignment.getStudent().getLrn(),
                            attendanceMap
                    );
                })
                .collect(Collectors.toList());

        String monthLabel = request.period().getMonth()
                .getDisplayName(TextStyle.FULL, Locale.ENGLISH);

        return new SF2TableResponse(
                schoolYear.getSchoolYearName(),
                section.getGradeLevel().name(),
                section.getSectionName(),
                monthLabel,
                schoolDays,
                studentRows
        );
    }

    private Map<Long, Map<LocalDate, AttendanceStatus>> loadAttendance(
            List<Long> assignmentIds, LocalDate start, LocalDate end) {
        if (assignmentIds.isEmpty()) {
            return Collections.emptyMap();
        }

        List<Attendance> attendanceRecords =
                attendanceRepository.findForAssignmentsAndPeriod(assignmentIds, start, end);

        Map<Long, Map<LocalDate, AttendanceStatus>> result = new HashMap<>();
        for (Attendance record : attendanceRecords) {
            LocalDate date = record.getCreatedAt();
            if (date == null) continue;

            result.computeIfAbsent(
                    record.getStudentSectionAssignment().getAssignmentId(),
                    k -> new HashMap<>()
            ).put(date, record.getAttendanceStatus());
        }
        return result;
    }

    private List<LocalDate> weekdaysInMonth(YearMonth period) {
        List<LocalDate> days = new ArrayList<>();
        LocalDate date = period.atDay(1);
        LocalDate end = period.atEndOfMonth();
        while (!date.isAfter(end)) {
            DayOfWeek dow = date.getDayOfWeek();
            if (dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY) {
                days.add(date);
            }
            date = date.plusDays(1);
        }
        return days;
    }

    private String toSf2Mark(AttendanceStatus status) {
        if (status == null) return null;
        return switch (status) {
            case present -> "P";
            case absent -> "A";
            case on_school -> null; // student hasn't tapped out yet — no mark
        };
    }

    private String formatStudentName(StudentSectionAssignment assignment) {
        var student = assignment.getStudent();
        return student.getLastName() + ", " + student.getFirstName() +
                (student.getMiddleName() != null && !student.getMiddleName().isBlank()
                        ? " " + student.getMiddleName() : "");
    }
}
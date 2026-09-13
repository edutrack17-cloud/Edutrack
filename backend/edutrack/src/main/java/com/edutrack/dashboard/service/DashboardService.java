package com.edutrack.dashboard.service;

import com.edutrack.attendance.entity.Attendance;
import com.edutrack.attendance.enums.AttendanceStatus;
import com.edutrack.attendance.repository.AttendanceRepository;
import com.edutrack.attendance.specification.AttendanceSpecification;
import com.edutrack.dashboard.dto.response.*;
import com.edutrack.dashboard.enums.DashboardPeriod;
import com.edutrack.dashboard.exception.NoActiveSchoolYearException;
import com.edutrack.dashboard.exception.NoSectionAssignedException;
import com.edutrack.dashboard.util.DashboardDateRangeResolver;
import com.edutrack.dashboard.util.DashboardDateRangeResolver.DateRange;
import com.edutrack.schoolyear.entity.SchoolYear;
import com.edutrack.schoolyear.enums.SchoolYearStatus;
import com.edutrack.schoolyear.repository.SchoolYearRepository;
import com.edutrack.section.entity.Section;
import com.edutrack.section.enums.SectionStatus;
import com.edutrack.section.repository.SectionRepository;
import com.edutrack.student.enums.StudentStatus;
import com.edutrack.student.repository.StudentRepository;
import com.edutrack.studentsectionassignment.repository.StudentSectionAssignmentRepository;
import com.edutrack.user.entity.User;
import com.edutrack.user.enums.AccountStatus;
import com.edutrack.user.enums.UserRole;
import com.edutrack.user.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class DashboardService {

    private final AttendanceRepository attendanceRepository;
    private final StudentRepository studentRepository;
    private final SectionRepository sectionRepository;
    private final UserRepository userRepository;
    private final SchoolYearRepository schoolYearRepository;
    private final StudentSectionAssignmentRepository assignmentRepository;

    public DashboardService(AttendanceRepository attendanceRepository,
                            StudentRepository studentRepository,
                            SectionRepository sectionRepository,
                            UserRepository userRepository,
                            SchoolYearRepository schoolYearRepository,
                            StudentSectionAssignmentRepository assignmentRepository) {
        this.attendanceRepository = attendanceRepository;
        this.studentRepository = studentRepository;
        this.sectionRepository = sectionRepository;
        this.userRepository = userRepository;
        this.schoolYearRepository = schoolYearRepository;
        this.assignmentRepository = assignmentRepository;
    }

    public AdminDashboardResponse getAdminDashboard(DashboardPeriod period, LocalDate anchorDate) {
        SchoolYear currentSchoolYear = getCurrentSchoolYear();
        LocalDate today = LocalDate.now();

        long enrolledStudents = studentRepository.countByStudentStatus(StudentStatus.enrolled);
        long activeTeachers = userRepository.countByUserRoleAndAccountStatus(UserRole.teacher, AccountStatus.active);
        long activeSections = sectionRepository.countBySectionStatusAndSchoolYear(SectionStatus.active, currentSchoolYear);

        Specification<Attendance> todayFilter = Specification
                .where(AttendanceSpecification.studentIsEnrolled())
                .and(AttendanceSpecification.createdToday(today));

        long presentToday = attendanceRepository.count(todayFilter.and(AttendanceSpecification.hasStatus(AttendanceStatus.present)));
        long onSchoolToday = attendanceRepository.count(todayFilter.and(AttendanceSpecification.hasStatus(AttendanceStatus.on_school)));
        long absentToday = attendanceRepository.count(todayFilter.and(AttendanceSpecification.hasStatus(AttendanceStatus.absent)));
        long incompleteAttendance = attendanceRepository.count(todayFilter.and(AttendanceSpecification.isIncomplete()));

        DashboardSummaryResponse summary = new DashboardSummaryResponse(
                enrolledStudents, activeTeachers, activeSections,
                presentToday, onSchoolToday, absentToday,
                incompleteAttendance, attendanceRate(presentToday, absentToday)
        );

        DateRange range = DashboardDateRangeResolver.resolve(period, anchorDate);
        List<AttendanceOverviewPointResponse> overview = buildAttendanceOverview(period, range, null);
        List<DashboardAttendanceLogResponse> recentAttendance = buildLogs(null, 10);

        return new AdminDashboardResponse(summary, overview, recentAttendance);
    }

    //TEACHER DASHBOARD
    public TeacherDashboardResponse getTeacherDashboard(DashboardPeriod period, LocalDate anchorDate, String username, Integer sectionId) {
        SchoolYear currentSchoolYear = getCurrentSchoolYear();

        Long teacherUserId = userRepository.findByUsername(username)
                .map(User::getUserId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + username));

        List<Section> mySections = sectionRepository.findByUser_UserIdAndSchoolYear(teacherUserId, currentSchoolYear);
        if (mySections.isEmpty()) {
            return emptyTeacherDashboard();
        }

        Section selectedSection = sectionId != null
                ? mySections.stream()
                .filter(s -> s.getSectionId() == sectionId)
                .findFirst()
                .orElseThrow(() -> new AccessDeniedException(
                        "Section " + sectionId + " is not assigned to teacher " + teacherUserId))
                : mySections.get(0);

        LocalDate today = LocalDate.now();
        long myStudents = assignmentRepository.countBySectionAndLeftAtIsNull(selectedSection);

        Specification<Attendance> todayFilter = Specification
                .where(AttendanceSpecification.hasSection(selectedSection.getSectionId()))
                .and(AttendanceSpecification.createdToday(today));

        long presentToday = attendanceRepository.count(todayFilter.and(AttendanceSpecification.hasStatus(AttendanceStatus.present)));
        long onSchoolToday = attendanceRepository.count(todayFilter.and(AttendanceSpecification.hasStatus(AttendanceStatus.on_school)));
        long absentToday = attendanceRepository.count(todayFilter.and(AttendanceSpecification.hasStatus(AttendanceStatus.absent)));
        long incompleteAttendance = attendanceRepository.count(todayFilter.and(AttendanceSpecification.isIncomplete()));

        TeacherDashboardSummaryResponse summary = new TeacherDashboardSummaryResponse(
                myStudents, presentToday, onSchoolToday, absentToday,
                attendanceRate(presentToday, absentToday), incompleteAttendance
        );

        DateRange range = DashboardDateRangeResolver.resolve(period, anchorDate);
        List<AttendanceOverviewPointResponse> overview = buildAttendanceOverview(period, range, selectedSection.getSectionId());
        List<DashboardAttendanceLogResponse> todayAttendance = buildLogs(selectedSection.getSectionId(), null);

        List<SectionSummaryResponse> sectionOptions = mySections.stream()
                .map(s -> new SectionSummaryResponse(s.getSectionId(), s.getSectionName()))
                .toList();

        return new TeacherDashboardResponse(summary, overview, todayAttendance, sectionOptions, selectedSection.getSectionId());
    }

    private TeacherDashboardResponse emptyTeacherDashboard() {
        TeacherDashboardSummaryResponse summary = new TeacherDashboardSummaryResponse(0, 0, 0, 0, 0.0, 0);
        return new TeacherDashboardResponse(summary, List.of(), List.of(), List.of(), null);
    }

    private SchoolYear getCurrentSchoolYear() {
        return schoolYearRepository.findBySchoolYearStatus(SchoolYearStatus.active)
                .orElseThrow(NoActiveSchoolYearException::new);
    }

    private double attendanceRate(long present, long absent) {
        long total = present + absent;
        return total == 0 ? 0.0 : Math.round((present * 10000.0) / total) / 100.0;
    }

    private List<AttendanceOverviewPointResponse> buildAttendanceOverview(DashboardPeriod period, DateRange range, Integer sectionId) {
        List<AttendanceOverviewPointResponse> points = new ArrayList<>();

        for (LocalDate[] bucket : DashboardDateRangeResolver.splitIntoBuckets(period, range)) {
            Specification<Attendance> bucketFilter = Specification
                    .where(AttendanceSpecification.studentIsEnrolled())
                    .and(AttendanceSpecification.createdBetween(bucket[0], bucket[1]));

            if (sectionId != null) {
                bucketFilter = bucketFilter.and(AttendanceSpecification.hasSection(sectionId));
            }

            long present = attendanceRepository.count(bucketFilter.and(AttendanceSpecification.hasStatus(AttendanceStatus.present)));
            long absent = attendanceRepository.count(bucketFilter.and(AttendanceSpecification.hasStatus(AttendanceStatus.absent)));
            long onSchool = attendanceRepository.count(bucketFilter.and(AttendanceSpecification.hasStatus(AttendanceStatus.on_school)));

            points.add(new AttendanceOverviewPointResponse(labelFor(period, bucket[0]), present, absent, onSchool));
        }
        return points;
    }

    private String labelFor(DashboardPeriod period, LocalDate bucketStart) {
        return switch (period) {
            case daily -> bucketStart.toString();
            case weekly -> bucketStart.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            case monthly -> "Week " + ((bucketStart.getDayOfMonth() - 1) / 7 + 1);
            case yearly -> bucketStart.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
        };
    }

    private List<DashboardAttendanceLogResponse> buildLogs(Integer sectionId, Integer limit) {
        Specification<Attendance> filter = Specification.where(AttendanceSpecification.createdToday(LocalDate.now()));
        if (sectionId != null) {
            filter = filter.and(AttendanceSpecification.hasSection(sectionId));
        }
        Sort sort = Sort.by(Sort.Direction.DESC, "dateTimeIn");

        List<Attendance> records = limit != null
                ? attendanceRepository.findAll(filter, PageRequest.of(0, limit, sort)).getContent()
                : attendanceRepository.findAll(filter, sort);

        return records.stream().map(a -> new DashboardAttendanceLogResponse(
                a.getStudentSectionAssignment().getStudent().getLrn(),
                a.getStudentSectionAssignment().getStudent().getFirstName() + " " + a.getStudentSectionAssignment().getStudent().getLastName(),
                a.getStudentSectionAssignment().getSection().getSectionName(),
                a.getDateTimeIn(), a.getDateTimeOut(), a.getAttendanceStatus()
        )).toList();
    }
}
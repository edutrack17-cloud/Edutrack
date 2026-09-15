package com.edutrack.schoolform.service;

import com.edutrack.attendance.entity.Attendance;
import com.edutrack.attendance.enums.AttendanceStatus;
import com.edutrack.attendance.repository.AttendanceRepository;
import com.edutrack.attendance.specification.AttendanceSpecification;
import com.edutrack.schoolform.dto.request.SF2ReportRequest;
import com.edutrack.schoolform.exception.SF2CapacityExceeded;
import com.edutrack.schoolyear.entity.SchoolYear;
import com.edutrack.section.entity.Section;
import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.exception.SectionNotFound;
import com.edutrack.section.repository.SectionRepository;
import com.edutrack.student.entity.Student;
import com.edutrack.student.enums.Sex;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import com.edutrack.studentsectionassignment.enums.ExitType;
import com.edutrack.studentsectionassignment.repository.StudentSectionAssignmentRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellReference;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class SF2ReportService {

    private static final String TEMPLATE_PATH = "templates/sf2-template.xlsx";

    // ---- Roster row ranges (1-based) ----
    private static final int MALE_FIRST_ROW = 8;
    private static final int MALE_LAST_ROW = 32;
    private static final int FEMALE_FIRST_ROW = 34;
    private static final int FEMALE_LAST_ROW = 60;

    // ---- Date / weekday header rows ----
    private static final int DATE_ROW = 6;
    private static final int WEEKDAY_ROW = 7;

    // ---- Columns (1-based) ----
    private static final int FIRST_DAY_COLUMN = 6;      // F
    private static final int NUMBER_COLUMN = 1;         // A
    private static final int NAME_COLUMN = 3;           // C
    private static final int REMARKS_COLUMN = 44;       // AR

    // ---- Header cells ----
    private static final String SCHOOL_YEAR_CELL = "M3";
    private static final String REPORT_MONTH_CELL = "AA3";
    private static final String GRADE_LEVEL_CELL = "AA4";
    private static final String SECTION_CELL = "AM4";
    private static final String SCHOOL_DAYS_CELL = "AW4";

    // ---- Summary block: cell coordinates (M, F, TOTAL) ----
    // Row 65: Enrolment as of 1st Friday
    private static final String ROW1_M = "AR65", ROW1_F = "AS65", ROW1_T = "AT65";
    // Row 66: Late enrolment during the month
    private static final String ROW2_M = "AR66", ROW2_F = "AS66", ROW2_T = "AT66";
    // Row 67: Registered Learners as of end of month
    private static final String ROW3_M = "AR67", ROW3_F = "AS67", ROW3_T = "AT67";
    // Row 73: Percentage of Enrolment as of end of month
    private static final String ROW4_M = "AR73", ROW4_F = "AS73", ROW4_T = "AT73";
    // Row 75: Average Daily Attendance
    private static final String ROW5_M = "AR75", ROW5_F = "AS75", ROW5_T = "AT75";
    // Row 77: Percentage of Attendance for the month
    private static final String ROW6_M = "AR77", ROW6_F = "AS77", ROW6_T = "AT77";
    // Row 78: Number of students absent for 5 consecutive days
    private static final String ROW7_M = "AR78", ROW7_F = "AS78", ROW7_T = "AT78";
    // Row 79: NLS
    private static final String ROW8_M = "AR79", ROW8_F = "AS79", ROW8_T = "AT79";
    // Row 81: Transferred out
    private static final String ROW9_M = "AR81", ROW9_F = "AS81", ROW9_T = "AT81";
    // Row 83: Transferred in
    private static final String ROW10_M = "AR83", ROW10_F = "AS83", ROW10_T = "AT83";
    // ---- NLS exit types ----
    // Any exit that removes the student from school.
    // promoted & section_transfer are excluded — student is still in school.
    // NOTE: EnumSet.of is null-safe in contains() unlike Set.of.
    private static final Set<ExitType> NLS_EXIT_TYPES = EnumSet.of(
            ExitType.dropped,
            ExitType.transferred_out,
            ExitType.graduated
    );

    private static final Set<ExitType> TRANSFERRED_OUT_TYPES = EnumSet.of(
            ExitType.transferred_out
    );

    private final SectionRepository sectionRepository;
    private final StudentSectionAssignmentRepository assignmentRepository;
    private final AttendanceRepository attendanceRepository;

    public SF2ReportService(SectionRepository sectionRepository,
                            StudentSectionAssignmentRepository assignmentRepository,
                            AttendanceRepository attendanceRepository) {
        this.sectionRepository = sectionRepository;
        this.assignmentRepository = assignmentRepository;
        this.attendanceRepository = attendanceRepository;
    }

    @PreAuthorize("hasRole('ADMIN') or (hasRole('TEACHER') and @studentAccessService.isAdviserOfSectionId(#request.sectionId()))")
    public byte[] generateReport(SF2ReportRequest request) {
        Section section = sectionRepository.findById(request.sectionId())
                .orElseThrow(() -> new SectionNotFound(request.sectionId()));

        LocalDate periodStart = request.period().atDay(1);
        LocalDate periodEnd = request.period().atEndOfMonth();

        List<StudentSectionAssignment> roster = assignmentRepository
                .findActiveDuringPeriod(section.getSectionId(), periodStart, periodEnd);

        List<LocalDate> schoolDays = weekdaysInMonth(request.period());
        if (schoolDays.size() > 31) {
            throw new SF2CapacityExceeded("day columns", schoolDays.size());
        }

        Map<Long, Map<LocalDate, AttendanceStatus>> attendanceByAssignment =
                loadAttendance(roster, periodStart, periodEnd);

        List<StudentSectionAssignment> maleRoster = filterAndSort(roster, Sex.Male);
        List<StudentSectionAssignment> femaleRoster = filterAndSort(roster, Sex.Female);

        if (maleRoster.size() > MALE_LAST_ROW - MALE_FIRST_ROW + 1) {
            throw new SF2CapacityExceeded("male", maleRoster.size());
        }
        if (femaleRoster.size() > FEMALE_LAST_ROW - FEMALE_FIRST_ROW + 1) {
            throw new SF2CapacityExceeded("female", femaleRoster.size());
        }

        SchoolYear schoolYear = section.getSchoolYear();
        LocalDate firstFriday = calculateFirstFriday(schoolYear.getStartDate());

        SummaryMetrics summary = computeSummary(
                section.getSectionId(), periodStart, periodEnd, firstFriday,
                schoolDays.size(), attendanceByAssignment, roster);

        try (InputStream template = new ClassPathResource(TEMPLATE_PATH).getInputStream();
             Workbook workbook = new XSSFWorkbook(template)) {

            Sheet sheet = workbook.getSheetAt(0);
            String sheetName = request.period().getMonth()
                    .getDisplayName(TextStyle.FULL, Locale.ENGLISH).toUpperCase();
            workbook.setSheetName(0, sheetName);

            writeHeader(sheet, section, request.period(), schoolDays.size());
            writeDayHeaders(sheet, schoolDays);
            writeRoster(sheet, maleRoster, MALE_FIRST_ROW, MALE_LAST_ROW,
                    schoolDays, attendanceByAssignment);
            writeRoster(sheet, femaleRoster, FEMALE_FIRST_ROW, FEMALE_LAST_ROW,
                    schoolDays, attendanceByAssignment);
            writeSummary(sheet, summary);

            workbook.setForceFormulaRecalculation(true);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to generate SF2 report", e);
        }
    }

    // ===============================================================
    // Summary computation
    // ===============================================================

    private SummaryMetrics computeSummary(int sectionId,
                                          LocalDate periodStart,
                                          LocalDate periodEnd,
                                          LocalDate firstFriday,
                                          int schoolDayCount,
                                          Map<Long, Map<LocalDate, AttendanceStatus>> attendanceByAssignment,
                                          List<StudentSectionAssignment> roster) {

        // Row 1: Enrolment as of 1st Friday
        List<StudentSectionAssignment> ffRoster = assignmentRepository
                .findActiveAsOfDate(sectionId, firstFriday);
        MetricValue enrolmentFf = countBySex(ffRoster);

        // Row 2: Late enrolment during the month
        List<StudentSectionAssignment> lateEnrolees = assignmentRepository
                .findAssignedDuringPeriod(sectionId, firstFriday.plusDays(1), periodEnd);
        MetricValue lateEnrolment = countBySex(lateEnrolees);

        // Row 3: Registered Learners as of end of month
        List<StudentSectionAssignment> eomRoster = assignmentRepository
                .findActiveAsOfDate(sectionId, periodEnd);
        MetricValue registeredEom = countBySex(eomRoster);

        // Row 4: Percentage of Enrolment as of EOM
        double pctEnrolM = percent(registeredEom.male(), enrolmentFf.male());
        double pctEnrolF = percent(registeredEom.female(), enrolmentFf.female());
        double pctEnrolT = percent(registeredEom.total(), enrolmentFf.total());
        MetricValue pctEnrolment = new MetricValue(pctEnrolM, pctEnrolF, pctEnrolT);

        // Row 5: Average Daily Attendance
        AttendanceCounts attCounts = countPresentsAndAbsents(roster, attendanceByAssignment);
        double avgM = schoolDayCount == 0 ? 0.0
                : Math.round((double) attCounts.presentsMale() / schoolDayCount * 100.0) / 100.0;
        double avgF = schoolDayCount == 0 ? 0.0
                : Math.round((double) attCounts.presentsFemale() / schoolDayCount * 100.0) / 100.0;
        double avgT = schoolDayCount == 0 ? 0.0
                : Math.round((double) (attCounts.presentsMale() + attCounts.presentsFemale())
                / schoolDayCount * 100.0) / 100.0;
        MetricValue avgDailyAttendance = new MetricValue(avgM, avgF, avgT);

        // Row 6: Percentage of Attendance for the month
        double pctAttM = percent(avgM, registeredEom.male());
        double pctAttF = percent(avgF, registeredEom.female());
        double pctAttT = percent(avgT, registeredEom.total());
        MetricValue pctAttendance = new MetricValue(pctAttM, pctAttF, pctAttT);

        // Row 7: Students absent for 5+ consecutive days
        ConsecutiveAbsenceCounts abs5 = countConsecutiveAbsences(
                roster, attendanceByAssignment, 5);
        MetricValue absent5 = new MetricValue(
                abs5.male(), abs5.female(), abs5.male() + abs5.female());

        // Row 8: NLS — dropped + transferred_out + graduated
        MetricValue nls = countExitsMatching(
                roster, periodStart, periodEnd, NLS_EXIT_TYPES);

        // Row 9: Transferred out — specific exit type only
        MetricValue transferredOut = countExitsMatching(
                roster, periodStart, periodEnd, TRANSFERRED_OUT_TYPES);

        // Row 10: Transferred in
        MetricValue transferredIn = countTransferredIn(sectionId, periodStart, periodEnd);

        return new SummaryMetrics(
                enrolmentFf, lateEnrolment, registeredEom,
                pctEnrolment, avgDailyAttendance, pctAttendance,
                absent5, nls, transferredOut, transferredIn);
    }

    private MetricValue countBySex(List<StudentSectionAssignment> list) {
        long m = list.stream().filter(a -> a.getStudent().getSex() == Sex.Male).count();
        long f = list.stream().filter(a -> a.getStudent().getSex() == Sex.Female).count();
        return new MetricValue(m, f, m + f);
    }

    private double percent(double numerator, double denominator) {
        if (denominator == 0) return 0.0;
        return Math.round((numerator / denominator) * 10000.0) / 100.0;
    }

    private AttendanceCounts countPresentsAndAbsents(
            List<StudentSectionAssignment> roster,
            Map<Long, Map<LocalDate, AttendanceStatus>> attendanceByAssignment) {

        long pM = 0, pF = 0, aM = 0, aF = 0;
        for (StudentSectionAssignment a : roster) {
            Map<LocalDate, AttendanceStatus> byDate = attendanceByAssignment
                    .getOrDefault(a.getAssignmentId(), Map.of());
            long p = byDate.values().stream().filter(s -> s == AttendanceStatus.present).count();
            long abs = byDate.values().stream().filter(s -> s == AttendanceStatus.absent).count();
            if (a.getStudent().getSex() == Sex.Male) { pM += p; aM += abs; }
            else { pF += p; aF += abs; }
        }
        return new AttendanceCounts(pM, pF, aM, aF);
    }

    private ConsecutiveAbsenceCounts countConsecutiveAbsences(
            List<StudentSectionAssignment> roster,
            Map<Long, Map<LocalDate, AttendanceStatus>> attendanceByAssignment,
            int threshold) {

        long male = 0, female = 0;
        for (StudentSectionAssignment a : roster) {
            Map<LocalDate, AttendanceStatus> byDate = attendanceByAssignment
                    .getOrDefault(a.getAssignmentId(), Map.of());
            if (hasConsecutiveAbsences(byDate, threshold)) {
                if (a.getStudent().getSex() == Sex.Male) male++;
                else female++;
            }
        }
        return new ConsecutiveAbsenceCounts(male, female);
    }

    private boolean hasConsecutiveAbsences(Map<LocalDate, AttendanceStatus> byDate, int threshold) {
        if (byDate.isEmpty()) return false;
        List<LocalDate> sortedDates = new ArrayList<>(byDate.keySet());
        Collections.sort(sortedDates);

        int run = 0;
        LocalDate prev = null;
        for (LocalDate d : sortedDates) {
            boolean isAbsent = byDate.get(d) == AttendanceStatus.absent;
            boolean adjacent = prev == null || d.toEpochDay() - prev.toEpochDay() <= 3;

            if (isAbsent && adjacent) {
                run++;
                if (run >= threshold) return true;
            } else if (isAbsent) {
                run = 1;
            } else {
                run = 0;
            }
            prev = d;
        }
        return false;
    }

    /**
     * Count students whose exit type matches any of {@code exitTypes}
     * AND whose {@code leftAt} falls within [periodStart, periodEnd].
     *
     * NOTE: We filter out null exitType BEFORE calling contains(),
     * because some immutable sets (like Set.of) throw NPE on contains(null).
     */
    private MetricValue countExitsMatching(List<StudentSectionAssignment> roster,
                                           LocalDate periodStart,
                                           LocalDate periodEnd,
                                           Set<ExitType> exitTypes) {
        long m = roster.stream()
                .filter(a -> a.getExitType() != null)
                .filter(a -> exitTypes.contains(a.getExitType()))
                .filter(a -> a.getLeftAt() != null
                        && !a.getLeftAt().isBefore(periodStart)
                        && !a.getLeftAt().isAfter(periodEnd))
                .filter(a -> a.getStudent().getSex() == Sex.Male)
                .count();
        long f = roster.stream()
                .filter(a -> a.getExitType() != null)
                .filter(a -> exitTypes.contains(a.getExitType()))
                .filter(a -> a.getLeftAt() != null
                        && !a.getLeftAt().isBefore(periodStart)
                        && !a.getLeftAt().isAfter(periodEnd))
                .filter(a -> a.getStudent().getSex() == Sex.Female)
                .count();
        return new MetricValue(m, f, m + f);
    }

    private MetricValue countTransferredIn(int sectionId,
                                           LocalDate periodStart,
                                           LocalDate periodEnd) {
        List<StudentSectionAssignment> newAssignments = assignmentRepository
                .findAssignedDuringPeriod(sectionId, periodStart, periodEnd);

        long m = 0, f = 0;
        for (StudentSectionAssignment a : newAssignments) {
            List<StudentSectionAssignment> prev = assignmentRepository
                    .findOtherAssignmentsForStudent(
                            a.getStudent().getStudentId(),
                            sectionId,
                            a.getAssignmentId());
            boolean cameFromTransfer = prev.stream()
                    .anyMatch(p -> p.getExitType() == ExitType.transferred_out);
            if (cameFromTransfer) {
                if (a.getStudent().getSex() == Sex.Male) m++;
                else f++;
            }
        }
        return new MetricValue(m, f, m + f);
    }

    // ===============================================================
    // Writers
    // ===============================================================

    private LocalDate calculateFirstFriday(LocalDate schoolYearStart) {
        LocalDate date = schoolYearStart;
        while (date.getDayOfWeek() != DayOfWeek.FRIDAY) {
            date = date.plusDays(1);
        }
        return date;
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

    private Map<Long, Map<LocalDate, AttendanceStatus>> loadAttendance(
            List<StudentSectionAssignment> roster,
            LocalDate periodStart,
            LocalDate periodEnd) {

        List<Long> assignmentIds = roster.stream()
                .map(StudentSectionAssignment::getAssignmentId)
                .toList();

        Map<Long, Map<LocalDate, AttendanceStatus>> result = new HashMap<>();
        if (assignmentIds.isEmpty()) return result;

        Specification<Attendance> filters = Specification
                .where(AttendanceSpecification.hasAssignmentIn(assignmentIds))
                .and(AttendanceSpecification.createdBetween(periodStart, periodEnd));

        for (Attendance record : attendanceRepository.findAll(filters)) {
            result.computeIfAbsent(
                            record.getStudentSectionAssignment().getAssignmentId(),
                            k -> new HashMap<>())
                    .put(record.getCreatedAt(), record.getAttendanceStatus());
        }
        return result;
    }

    private List<StudentSectionAssignment> filterAndSort(
            List<StudentSectionAssignment> roster, Sex sex) {
        return roster.stream()
                .filter(a -> a.getStudent().getSex() == sex)
                .sorted(Comparator.comparing(
                                (StudentSectionAssignment a) -> a.getStudent().getLastName())
                        .thenComparing(a -> a.getStudent().getFirstName()))
                .toList();
    }

    private void writeHeader(Sheet sheet, Section section, YearMonth period,
                             int schoolDayCount) {
        SchoolYear schoolYear = section.getSchoolYear();
        String monthLabel = period.getMonth()
                .getDisplayName(TextStyle.FULL, Locale.ENGLISH).toUpperCase();

        setCell(sheet, SCHOOL_YEAR_CELL, schoolYear.getSchoolYearName());
        setCell(sheet, REPORT_MONTH_CELL, monthLabel);
        setCell(sheet, GRADE_LEVEL_CELL, gradeLevelLabel(section.getGradeLevel()));
        setCell(sheet, SECTION_CELL, section.getSectionName());
        setCell(sheet, SCHOOL_DAYS_CELL, schoolDayCount);
    }

    private void writeDayHeaders(Sheet sheet, List<LocalDate> schoolDays) {
        for (int i = 0; i < schoolDays.size(); i++) {
            LocalDate date = schoolDays.get(i);
            int col = FIRST_DAY_COLUMN + i;
            setCell(sheet, DATE_ROW, col, date.getDayOfMonth());
            setCell(sheet, WEEKDAY_ROW, col, weekdayLetter(date.getDayOfWeek()));
        }
    }

    private void writeRoster(Sheet sheet,
                             List<StudentSectionAssignment> assignments,
                             int firstRow, int lastRow,
                             List<LocalDate> schoolDays,
                             Map<Long, Map<LocalDate, AttendanceStatus>> attendanceByAssignment) {

        int row = firstRow;
        for (StudentSectionAssignment assignment : assignments) {
            Student student = assignment.getStudent();

            setCell(sheet, row, NUMBER_COLUMN, row - firstRow + 1);
            setCell(sheet, row, NAME_COLUMN, formatSF2Name(student));

            Map<LocalDate, AttendanceStatus> byDate = attendanceByAssignment
                    .getOrDefault(assignment.getAssignmentId(), Map.of());

            for (int i = 0; i < schoolDays.size(); i++) {
                LocalDate schoolDay = schoolDays.get(i);
                AttendanceStatus status = byDate.get(schoolDay);
                String mark = toSf2Mark(status);
                if (mark != null) {
                    setCell(sheet, row, FIRST_DAY_COLUMN + i, mark);
                }
            }

            String remarks = buildRemarks(assignment);
            if (remarks != null && !remarks.isBlank()) {
                setCell(sheet, row, REMARKS_COLUMN, remarks);
            }

            row++;
        }

        for (int emptyRow = firstRow + assignments.size(); emptyRow <= lastRow; emptyRow++) {
            clearRowData(sheet, emptyRow, schoolDays.size());
        }
    }

    private String toSf2Mark(AttendanceStatus status) {
        if (status == null) return null;
        if (status == AttendanceStatus.absent) return "A";
        return "P";
    }

    private String buildRemarks(StudentSectionAssignment assignment) {
        if (assignment.getLeftAt() == null && assignment.getExitType() == null) {
            return null;
        }
        ExitType exitType = assignment.getExitType();
        if (exitType == null) return null;

        String note = assignment.getRemarks();
        return switch (exitType) {
            case dropped         -> "NLS: " + remarkOr(note, "Dropped");
            case transferred_out -> "NLS (Transferred Out): " + remarkOr(note, "School name not specified");
            case graduated       -> "NLS: Graduated";
            case promoted, section_transfer -> null;
        };
    }

    private String remarkOr(String value, String fallback) {
        return (value != null && !value.isBlank()) ? value : fallback;
    }

    private void clearRowData(Sheet sheet, int rowNum, int schoolDayCount) {
        Row row = sheet.getRow(rowNum - 1);
        if (row == null) return;

        int[] staticCols = { NUMBER_COLUMN, NAME_COLUMN, REMARKS_COLUMN };
        for (int col : staticCols) {
            Cell cell = row.getCell(col - 1);
            if (cell != null) cell.setBlank();
        }
        for (int i = 0; i < schoolDayCount; i++) {
            Cell cell = row.getCell(FIRST_DAY_COLUMN + i - 1);
            if (cell != null) cell.setBlank();
        }
    }

    private void writeSummary(Sheet sheet, SummaryMetrics s) {
        writeMetric(sheet, ROW1_M, ROW1_F, ROW1_T, s.enrolmentFirstFriday());
        writeMetric(sheet, ROW2_M, ROW2_F, ROW2_T, s.lateEnrolment());
        writeMetric(sheet, ROW3_M, ROW3_F, ROW3_T, s.registeredEndOfMonth());
        writeMetric(sheet, ROW4_M, ROW4_F, ROW4_T, s.percentEnrolment());
        writeMetric(sheet, ROW5_M, ROW5_F, ROW5_T, s.averageDailyAttendance());
        writeMetric(sheet, ROW6_M, ROW6_F, ROW6_T, s.percentAttendance());
        writeMetric(sheet, ROW7_M, ROW7_F, ROW7_T, s.absentFiveConsecutive());
        writeMetric(sheet, ROW8_M, ROW8_F, ROW8_T, s.nls());
        writeMetric(sheet, ROW9_M, ROW9_F, ROW9_T, s.transferredOut());
        writeMetric(sheet, ROW10_M, ROW10_F, ROW10_T, s.transferredIn());
    }

    private void writeMetric(Sheet sheet, String mCell, String fCell, String tCell, MetricValue v) {
        setCell(sheet, mCell, v.male());
        setCell(sheet, fCell, v.female());
        setCell(sheet, tCell, v.total());
    }

    // ===============================================================
    // Helpers
    // ===============================================================

    private String formatSF2Name(Student student) {
        StringBuilder name = new StringBuilder()
                .append(student.getLastName())
                .append(", ")
                .append(student.getFirstName());
        if (student.getMiddleName() != null && !student.getMiddleName().isBlank()) {
            name.append(", ").append(student.getMiddleName());
        }
        return name.toString();
    }

    private String gradeLevelLabel(GradeLevel gradeLevel) {
        return switch (gradeLevel) {
            case Grade_4 -> "FOUR";
            case Grade_5 -> "FIVE";
            case Grade_6 -> "SIX";
        };
    }

    private String weekdayLetter(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> "M";
            case TUESDAY -> "T";
            case WEDNESDAY -> "W";
            case THURSDAY -> "TH";
            case FRIDAY -> "F";
            default -> "";
        };
    }

    private void setCell(Sheet sheet, String coordinate, Object value) {
        CellReference ref = new CellReference(coordinate);
        setCell(sheet, ref.getRow() + 1, ref.getCol() + 1, value);
    }

    private void setCell(Sheet sheet, int rowNum, int colNum, Object value) {
        Row row = sheet.getRow(rowNum - 1);
        if (row == null) row = sheet.createRow(rowNum - 1);
        Cell cell = row.getCell(colNum - 1);
        if (cell == null) cell = row.createCell(colNum - 1);

        if (value == null) {
            cell.setBlank();
        } else if (value instanceof Number n) {
            cell.setCellValue(n.doubleValue());
        } else {
            cell.setCellValue(String.valueOf(value));
        }
    }

    // ===============================================================
    // Internal records
    // ===============================================================

    private record MetricValue(double male, double female, double total) {
        MetricValue(long male, long female, long total) {
            this((double) male, (double) female, (double) total);
        }
    }

    private record AttendanceCounts(long presentsMale, long presentsFemale,
                                    long absentsMale, long absentsFemale) { }

    private record ConsecutiveAbsenceCounts(long male, long female) { }

    private record SummaryMetrics(
            MetricValue enrolmentFirstFriday,
            MetricValue lateEnrolment,
            MetricValue registeredEndOfMonth,
            MetricValue percentEnrolment,
            MetricValue averageDailyAttendance,
            MetricValue percentAttendance,
            MetricValue absentFiveConsecutive,
            MetricValue nls,
            MetricValue transferredOut,
            MetricValue transferredIn) { }
}
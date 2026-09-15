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

    // ---- Header cells we WRITE (F3/F4 are hardcoded in template) ----
    private static final String SCHOOL_YEAR_CELL = "M3";
    private static final String REPORT_MONTH_CELL = "AA3";
    private static final String GRADE_LEVEL_CELL = "AA4";
    private static final String SECTION_CELL = "AM4";
    private static final String SCHOOL_DAYS_CELL = "AW4";

    // ---- Enrollment summary (row 65 of Summary block) ----
    private static final String ENROLLMENT_MALE_CELL   = "AR65";
    private static final String ENROLLMENT_FEMALE_CELL = "AS65";
    private static final String ENROLLMENT_TOTAL_CELL  = "AT65";

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
        EnrollmentCounts enrollmentCounts =
                calculateEnrollmentSinceFirstFriday(section.getSectionId(), firstFriday);

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
            writeEnrollmentSummary(sheet, enrollmentCounts);

            workbook.setForceFormulaRecalculation(true);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to generate SF2 report", e);
        }
    }

    // ---------------------------------------------------------------
    // Enrollment since 1st Friday
    // ---------------------------------------------------------------

    private LocalDate calculateFirstFriday(LocalDate schoolYearStart) {
        LocalDate date = schoolYearStart;
        while (date.getDayOfWeek() != DayOfWeek.FRIDAY) {
            date = date.plusDays(1);
        }
        return date;
    }

    private EnrollmentCounts calculateEnrollmentSinceFirstFriday(
            int sectionId, LocalDate firstFriday) {

        List<StudentSectionAssignment> enrollmentRoster = assignmentRepository
                .findActiveAsOfDate(sectionId, firstFriday);

        long male = enrollmentRoster.stream()
                .filter(a -> a.getStudent().getSex() == Sex.Male)
                .count();
        long female = enrollmentRoster.stream()
                .filter(a -> a.getStudent().getSex() == Sex.Female)
                .count();

        return new EnrollmentCounts((int) male, (int) female);
    }

    // ---------------------------------------------------------------
    // Days and attendance
    // ---------------------------------------------------------------

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

    // ---------------------------------------------------------------
    // Writers
    // ---------------------------------------------------------------

    private void writeHeader(Sheet sheet, Section section, YearMonth period,
                             int schoolDayCount) {
        SchoolYear schoolYear = section.getSchoolYear();
        String monthLabel = period.getMonth()
                .getDisplayName(TextStyle.FULL, Locale.ENGLISH).toUpperCase();

        // School ID (F3) and Name of School (F4) are hardcoded in the template.
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
                // else: leave cell untouched — it stays blank but keeps template styling
            }

            String remarks = buildRemarks(assignment);
            if (remarks != null && !remarks.isBlank()) {
                setCell(sheet, row, REMARKS_COLUMN, remarks);
            }

            row++;
        }

        // Blank out unused roster rows (values only, keep styles)
        for (int emptyRow = firstRow + assignments.size(); emptyRow <= lastRow; emptyRow++) {
            clearRowData(sheet, emptyRow, schoolDays.size());
        }
    }

    /**
     * SF2 attendance mark.
     *   absent    → "A"  (explicit record of absence)
     *   present   → "P"
     *   on_school → "P"  (transient; student is on campus)
     *   null      → "P"  (no record = not flagged as absent)
     */
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
        if (exitType == null) {
            return null;
        }

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

    /**
     * Blank cell VALUES only (preserve borders/styles from template).
     */
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

    private void writeEnrollmentSummary(Sheet sheet, EnrollmentCounts counts) {
        setCell(sheet, ENROLLMENT_MALE_CELL, counts.male());
        setCell(sheet, ENROLLMENT_FEMALE_CELL, counts.female());
        setCell(sheet, ENROLLMENT_TOTAL_CELL, counts.total());
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

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

    private record EnrollmentCounts(int male, int female) {
        int total() { return male + female; }
    }
}
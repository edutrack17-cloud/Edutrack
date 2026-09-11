package com.edutrack.schoolform.service;

import com.edutrack.attendance.entity.Attendance;
import com.edutrack.attendance.enums.AttendanceStatus;
import com.edutrack.attendance.repository.AttendanceRepository;
import com.edutrack.attendance.specification.AttendanceSpecification;
import com.edutrack.schoolform.dto.request.SF2ReportRequest;
import com.edutrack.schoolform.exception.SF2CapacityExceeded;
import com.edutrack.section.entity.Section;
import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.exception.SectionNotFound;
import com.edutrack.section.repository.SectionRepository;
import com.edutrack.student.entity.Student;
import com.edutrack.student.enums.Sex;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import com.edutrack.studentsectionassignment.repository.StudentSectionAssignmentRepository;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
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
import java.time.format.TextStyle;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class SF2ReportService {

    private static final String TEMPLATE_PATH = "templates/sf2-template.xlsx";

    private static final int MALE_FIRST_ROW = 8;
    private static final int MALE_LAST_ROW = 32;
    private static final int FEMALE_FIRST_ROW = 34;
    private static final int FEMALE_LAST_ROW = 60;
    private static final int DATE_ROW = 6;
    private static final int WEEKDAY_ROW = 7;
    private static final int FIRST_DAY_COLUMN = 6;   // F
    private static final int NUMBER_COLUMN = 1;      // A
    private static final int NAME_COLUMN = 3;        // C
    private static final int ABSENT_FORMULA_COLUMN = 39;  // AM
    private static final int PRESENT_FORMULA_COLUMN = 41; // AO

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

        List<LocalDate> schoolDays = attendanceRepository
                .findDistinctAttendanceDatesForSection(section.getSectionId(), periodStart, periodEnd);

        if (schoolDays.size() > FIRST_DAY_COLUMN + 32) { // sanity guard, template has room to ~AL
            throw new SF2CapacityExceeded("day columns", schoolDays.size());
        }

        Map<Long, Map<LocalDate, AttendanceStatus>> attendanceByAssignment = loadAttendance(roster, periodStart, periodEnd);

        List<StudentSectionAssignment> maleRoster = filterAndSort(roster, Sex.Male);
        List<StudentSectionAssignment> femaleRoster = filterAndSort(roster, Sex.Female);

        if (maleRoster.size() > MALE_LAST_ROW - MALE_FIRST_ROW + 1) {
            throw new SF2CapacityExceeded("male", maleRoster.size());
        }
        if (femaleRoster.size() > FEMALE_LAST_ROW - FEMALE_FIRST_ROW + 1) {
            throw new SF2CapacityExceeded("female", femaleRoster.size());
        }

        try (InputStream template = new ClassPathResource(TEMPLATE_PATH).getInputStream();
             Workbook workbook = new XSSFWorkbook(template)) {

            Sheet sheet = workbook.getSheetAt(0);
            workbook.setSheetName(0, request.period().getMonth()
                    .getDisplayName(TextStyle.FULL, Locale.ENGLISH).toUpperCase());

            writeHeader(sheet, section, request.period(), schoolDays.size());
            writeDayHeaders(sheet, schoolDays);
            writeRoster(sheet, maleRoster, MALE_FIRST_ROW, MALE_LAST_ROW, schoolDays, attendanceByAssignment);
            writeRoster(sheet, femaleRoster, FEMALE_FIRST_ROW, FEMALE_LAST_ROW, schoolDays, attendanceByAssignment);

            workbook.setForceFormulaRecalculation(true);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to generate SF2 report", e);
        }
    }

    private Map<Long, Map<LocalDate, AttendanceStatus>> loadAttendance(
            List<StudentSectionAssignment> roster, LocalDate periodStart, LocalDate periodEnd) {

        List<Long> assignmentIds = roster.stream().map(StudentSectionAssignment::getAssignmentId).toList();
        Map<Long, Map<LocalDate, AttendanceStatus>> result = new HashMap<>();
        if (assignmentIds.isEmpty()) return result;

        Specification<Attendance> filters = Specification
                .where(AttendanceSpecification.hasAssignmentIn(assignmentIds))
                .and(AttendanceSpecification.createdBetween(periodStart, periodEnd));

        for (Attendance record : attendanceRepository.findAll(filters)) {
            result.computeIfAbsent(record.getStudentSectionAssignment().getAssignmentId(), k -> new HashMap<>())
                    .put(record.getCreatedAt(), record.getAttendanceStatus());
        }
        return result;
    }

    private List<StudentSectionAssignment> filterAndSort(List<StudentSectionAssignment> roster, Sex sex) {
        return roster.stream()
                .filter(a -> a.getStudent().getSex() == sex)
                .sorted(Comparator.comparing(a -> a.getStudent().getLastName()))
                .toList();
    }

    private void writeHeader(Sheet sheet, Section section, java.time.YearMonth period, int schoolDayCount) {
        setCell(sheet, "M3", section.getSchoolYear().getSchoolYearName());
        setCell(sheet, "AA3", period.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH).toUpperCase());
        setCell(sheet, "AA4", gradeLevelLabel(section.getGradeLevel()));
        setCell(sheet, "AM4", section.getSectionName());
        setCell(sheet, "AW4", schoolDayCount);
    }

    private void writeDayHeaders(Sheet sheet, List<LocalDate> schoolDays) {
        for (int i = 0; i < schoolDays.size(); i++) {
            LocalDate date = schoolDays.get(i);
            int col = FIRST_DAY_COLUMN + i;
            setCell(sheet, DATE_ROW, col, date.getDayOfMonth());
            setCell(sheet, WEEKDAY_ROW, col, weekdayLetter(date.getDayOfWeek()));
        }
    }

    private void writeRoster(Sheet sheet, List<StudentSectionAssignment> assignments,
                             int firstRow, int lastRow, List<LocalDate> schoolDays,
                             Map<Long, Map<LocalDate, AttendanceStatus>> attendanceByAssignment) {

        int row = firstRow;
        for (StudentSectionAssignment assignment : assignments) {
            Student student = assignment.getStudent();
            setCell(sheet, row, NUMBER_COLUMN, row - firstRow + 1);
            setCell(sheet, row, NAME_COLUMN, formatSF2Name(student));

            Map<LocalDate, AttendanceStatus> byDate = attendanceByAssignment
                    .getOrDefault(assignment.getAssignmentId(), Map.of());

            for (int i = 0; i < schoolDays.size(); i++) {
                if (byDate.get(schoolDays.get(i)) == AttendanceStatus.absent) {
                    setCell(sheet, row, FIRST_DAY_COLUMN + i, "X");
                }
            }
            row++;
        }

        for (int emptyRow = firstRow + assignments.size(); emptyRow <= lastRow; emptyRow++) {
            clearRow(sheet, emptyRow);
        }
    }

    private void clearRow(Sheet sheet, int rowNum) {
        Row row = sheet.getRow(rowNum - 1);
        if (row == null) return;
        for (int col : new int[]{NUMBER_COLUMN, NAME_COLUMN, ABSENT_FORMULA_COLUMN, PRESENT_FORMULA_COLUMN}) {
            Cell cell = row.getCell(col - 1);
            if (cell != null) cell.setBlank();
        }
    }

    private String formatSF2Name(Student student) {
        StringBuilder name = new StringBuilder()
                .append(student.getLastName()).append(", ").append(student.getFirstName());
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
        if (value instanceof Number n) {
            cell.setCellValue(n.doubleValue());
        } else {
            cell.setCellValue(String.valueOf(value));
        }
    }
}
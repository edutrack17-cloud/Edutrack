package com.edutrack.studentsectionassignment.repository;

import com.edutrack.schoolyear.entity.SchoolYear;
import com.edutrack.schoolyear.enums.SchoolYearStatus;
import com.edutrack.section.entity.Section;
import com.edutrack.student.entity.Student;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StudentSectionAssignmentRepository
        extends JpaRepository<StudentSectionAssignment, Long>,
        JpaSpecificationExecutor<StudentSectionAssignment> {

    Optional<StudentSectionAssignment> findByStudent_StudentIdAndLeftAtIsNull(
            Long studentId
    );

    Optional<StudentSectionAssignment> findByStudentAndLeftAtIsNull(
            Student student
    );

    /**
     * Roster for the SF2 table view (and Excel export).
     *
     * Semantics: "every student assigned to this section, minus anyone who
     * left before the reporting period."
     *
     * NOTE: `assignedAt` is intentionally NOT used as a filter here.
     * Students are considered part of the section for the whole school year,
     * so the SF2 for May, June, July, September, etc. all list the same roster
     * (subject to `leftAt`). This matches how the real SF2 works: a section
     * roster is stable across months; only the attendance marks change.
     *
     * The `leftAt >= :periodStart` check still correctly removes students who
     * left the section before the viewed month.
     */
    @Query("""
        SELECT a FROM StudentSectionAssignment a
        WHERE a.section.sectionId = :sectionId
        AND (a.leftAt IS NULL OR a.leftAt >= :periodStart)
        ORDER BY a.student.lastName, a.student.firstName
        """)
    List<StudentSectionAssignment> findActiveDuringPeriod(
            @Param("sectionId") int sectionId,
            @Param("periodStart") LocalDate periodStart,
            @Param("periodEnd") LocalDate periodEnd);

    Optional<StudentSectionAssignment> findByStudent_RfidAndLeftAtIsNull(String rfid);

    List<StudentSectionAssignment> findByStudent_StudentIdInAndLeftAtIsNull(List<Long> studentIds);

    Boolean existsBySectionAndSection_SchoolYear_SchoolYearStatus(Section section, SchoolYearStatus schoolYearStatus);

    List<StudentSectionAssignment> findByStudent_StudentIdOrderByAssignmentIdDesc(Long studentId);

    long countBySectionAndLeftAtIsNull(Section section);

    Long student(Student student);

    Optional<StudentSectionAssignment> findFirstByStudent_StudentIdOrderByAssignmentIdDesc(Long studentId);

    /**
     * Used by SF2ReportService for the "Enrolment as of 1st Friday" metric.
     *
     * This one DOES need real enrolment-date semantics: it answers
     * "how many students were enrolled in this section on <asOfDate>?".
     * Do NOT relax `assignedAt` here.
     */
    @Query("""
    SELECT a FROM StudentSectionAssignment a
    WHERE a.section.sectionId = :sectionId
    AND a.assignedAt <= :asOfDate
    AND (a.leftAt IS NULL OR a.leftAt >= :asOfDate)
    ORDER BY a.student.lastName, a.student.firstName
    """)
    List<StudentSectionAssignment> findActiveAsOfDate(
            @Param("sectionId") int sectionId,
            @Param("asOfDate") LocalDate asOfDate);

    /**
     * Used by SF2ReportService for "Late enrolment during the month"
     * and "Transferred in" metrics.
     *
     * This one DOES need real enrolment-date semantics: it answers
     * "which students joined this section between <periodStart> and <periodEnd>?".
     * Do NOT relax `assignedAt` here.
     */
    @Query("""
    SELECT a FROM StudentSectionAssignment a
    WHERE a.section.sectionId = :sectionId
    AND a.assignedAt BETWEEN :periodStart AND :periodEnd
    ORDER BY a.student.lastName, a.student.firstName
    """)
    List<StudentSectionAssignment> findAssignedDuringPeriod(
            @Param("sectionId") int sectionId,
            @Param("periodStart") LocalDate periodStart,
            @Param("periodEnd") LocalDate periodEnd);

    @Query("""
    SELECT a FROM StudentSectionAssignment a
    WHERE a.student.studentId = :studentId
    AND a.assignmentId <> :excludeAssignmentId
    AND a.section.sectionId <> :sectionId
    ORDER BY a.assignedAt DESC
    """)
    List<StudentSectionAssignment> findOtherAssignmentsForStudent(
            @Param("studentId") long studentId,
            @Param("sectionId") int sectionId,
            @Param("excludeAssignmentId") long excludeAssignmentId);

    /**
     * Roster for the SF2 table view, scoped by school year.
     *
     * Same semantics as findActiveDuringPeriod, but also filters by school
     * year. `assignedAt` is intentionally NOT used as a filter — see the
     * comment on findActiveDuringPeriod for the reasoning.
     *
     * If you ever see an empty roster here, the most likely culprit is a
     * mismatch between the `schoolYearId` sent by the UI and the school year
     * attached to the section. Check `section.school_year_id` before assuming
     * the query is broken.
     */
    @Query("""
        SELECT a FROM StudentSectionAssignment a
        WHERE a.section.sectionId = :sectionId
        AND a.section.schoolYear = :schoolYear
        AND (a.leftAt IS NULL OR a.leftAt >= :periodStart)
        ORDER BY a.student.lastName, a.student.firstName
        """)
    List<StudentSectionAssignment> findRosterForSectionAndYear(
            @Param("sectionId") int sectionId,
            @Param("schoolYear") SchoolYear schoolYear,
            @Param("periodStart") LocalDate periodStart,
            @Param("periodEnd") LocalDate periodEnd);
}
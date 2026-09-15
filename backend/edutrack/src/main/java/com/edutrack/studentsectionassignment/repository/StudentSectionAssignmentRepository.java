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

    @Query("""
        SELECT a FROM StudentSectionAssignment a
        WHERE a.section.sectionId = :sectionId
        AND a.assignedAt <= :periodEnd
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
}
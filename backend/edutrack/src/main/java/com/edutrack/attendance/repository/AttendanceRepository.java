package com.edutrack.attendance.repository;

import com.edutrack.attendance.entity.Attendance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AttendanceRepository
        extends JpaRepository<Attendance, Long>,
        JpaSpecificationExecutor<Attendance> {

    @Query("""
        SELECT a
        FROM Attendance a
        WHERE a.studentSectionAssignment.assignmentId IN :assignmentIds
        AND a.createdAt BETWEEN :periodStart AND :periodEnd
        ORDER BY a.studentSectionAssignment.assignmentId, a.createdAt
        """)
    List<Attendance> findForAssignmentsAndPeriod(
            @Param("assignmentIds") List<Long> assignmentIds,
            @Param("periodStart") LocalDate periodStart,
            @Param("periodEnd") LocalDate periodEnd
    );

    @Query("""
        SELECT DISTINCT a.createdAt
        FROM Attendance a
        WHERE a.studentSectionAssignment.section.sectionId = :sectionId
        AND a.createdAt BETWEEN :periodStart AND :periodEnd
        ORDER BY a.createdAt
        """)
    List<LocalDate> findDistinctAttendanceDatesForSection(
            @Param("sectionId") int sectionId,
            @Param("periodStart") LocalDate periodStart,
            @Param("periodEnd") LocalDate periodEnd
    );

    @EntityGraph(attributePaths = {
            "studentSectionAssignment",
            "studentSectionAssignment.student",
            "studentSectionAssignment.section"
    })
    @Override
    Page<Attendance> findAll(
            Specification<Attendance> spec,
            Pageable pageable
    );
}
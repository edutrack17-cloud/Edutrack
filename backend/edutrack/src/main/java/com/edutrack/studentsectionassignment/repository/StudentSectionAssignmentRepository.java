package com.edutrack.studentsectionassignment.repository;

import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface StudentSectionAssignmentRepository extends JpaRepository<StudentSectionAssignment, Long>, JpaSpecificationExecutor<StudentSectionAssignment> {

    @Query("""
        SELECT assignment
        FROM StudentSectionAssignment assignment
        JOIN FETCH assignment.student
        JOIN FETCH assignment.section
        WHERE assignment.leftAt IS NULL
    """)
    Page<StudentSectionAssignment> findCurrentAssignments(Pageable pageable);
}
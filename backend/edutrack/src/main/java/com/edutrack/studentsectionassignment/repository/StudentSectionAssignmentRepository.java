package com.edutrack.studentsectionassignment.repository;

import com.edutrack.student.entity.Student;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

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

    Optional<StudentSectionAssignment> findByStudent_RfidAndLeftAtIsNull(String rfid);

    Long student(Student student);
}
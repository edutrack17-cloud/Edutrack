package com.edutrack.studentsectionassignment.repository;

import com.edutrack.schoolyear.entity.SchoolYear;
import com.edutrack.schoolyear.enums.SchoolYearStatus;
import com.edutrack.section.entity.Section;
import com.edutrack.student.entity.Student;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

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

    Optional<StudentSectionAssignment> findByStudent_RfidAndLeftAtIsNull(String rfid);

    List<StudentSectionAssignment> findByStudent_StudentIdInAndLeftAtIsNull(List<Long> studentIds);

    Boolean existsBySectionAndSection_SchoolYear_SchoolYearStatus(Section section, SchoolYearStatus schoolYearStatus);

    List<StudentSectionAssignment> findByStudent_StudentIdOrderByAssignmentIdDesc(Long studentId);

    long countBySectionAndLeftAtIsNull(Section section);

    Long student(Student student);
}
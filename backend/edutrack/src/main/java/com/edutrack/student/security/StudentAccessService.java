package com.edutrack.student.security;

import com.edutrack.security.SecurityUtils;
import com.edutrack.studentsectionassignment.repository.StudentSectionAssignmentRepository;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import org.springframework.stereotype.Component;

import java.util.List;

@Component("studentAccessService")
public class StudentAccessService {

    private final StudentSectionAssignmentRepository studentSectionAssignmentRepository;

    public StudentAccessService(StudentSectionAssignmentRepository studentSectionAssignmentRepository) {
        this.studentSectionAssignmentRepository = studentSectionAssignmentRepository;
    }

    public boolean isAdviserOfStudent(Long studentId) {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        return studentSectionAssignmentRepository
                .findByStudent_StudentIdAndLeftAtIsNull(studentId)
                .map(a -> a.getSection().getUser().getUserId())
                .map(currentUserId::equals)
                .orElse(false);
    }

    public boolean isAdviserOfAllStudents(List<Long> studentIds) {
        if (studentIds == null || studentIds.isEmpty()) return false;

        Long currentUserId = SecurityUtils.getCurrentUserId();
        List<StudentSectionAssignment> assignments =
                studentSectionAssignmentRepository.findByStudent_StudentIdInAndLeftAtIsNull(studentIds);

        if (assignments.size() != studentIds.size()) return false; // someone has no active assignment

        return assignments.stream()
                .allMatch(a -> currentUserId.equals(a.getSection().getUser().getUserId()));
    }
}
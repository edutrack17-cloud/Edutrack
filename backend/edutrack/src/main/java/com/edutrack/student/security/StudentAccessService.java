package com.edutrack.student.security;

import com.edutrack.schoolyear.enums.SchoolYearStatus;
import com.edutrack.security.SecurityUtils;
import com.edutrack.section.repository.SectionRepository;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import com.edutrack.studentsectionassignment.repository.StudentSectionAssignmentRepository;
import org.springframework.stereotype.Component;

import java.util.List;

@Component("studentAccessService")
public class StudentAccessService {

    private final StudentSectionAssignmentRepository studentSectionAssignmentRepository;
    private final SectionRepository sectionRepository;

    public StudentAccessService(StudentSectionAssignmentRepository studentSectionAssignmentRepository,
                                SectionRepository sectionRepository) {
        this.studentSectionAssignmentRepository = studentSectionAssignmentRepository;
        this.sectionRepository = sectionRepository;
    }

    public boolean isAdviserOfStudent(Long studentId) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        return studentSectionAssignmentRepository
                .findByStudent_StudentIdAndLeftAtIsNull(studentId)
                .map(a -> a.getSection().getUser().getUserId())
                .map(currentUserId::equals)
                .orElse(false);
    }

    public boolean hasAdvisedStudent(Long studentId) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        return studentSectionAssignmentRepository
                .findFirstByStudent_StudentIdOrderByAssignmentIdDesc(studentId)
                .map(a -> a.getSection().getUser().getUserId())
                .map(currentUserId::equals)
                .orElse(false);
    }

    public boolean isAdviserOfSectionId(Integer sectionId) {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        return sectionRepository.findById(sectionId)
                .map(section -> section.getUser().getUserId())
                .map(currentUserId::equals)
                .orElse(false);
    }

    public boolean isAdviserOfAllStudents(List<Long> studentIds) {
        if (studentIds == null || studentIds.isEmpty()) return false;

        Long currentUserId = SecurityUtils.getCurrentUserId();
        List<StudentSectionAssignment> assignments =
                studentSectionAssignmentRepository.findByStudent_StudentIdInAndLeftAtIsNull(studentIds);

        if (assignments.size() != studentIds.size()) return false;

        return assignments.stream()
                .allMatch(a -> currentUserId.equals(a.getSection().getUser().getUserId()));
    }

    public boolean isAdviserOfStudentByRfid(String rfid) {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        return studentSectionAssignmentRepository
                .findByStudent_RfidAndLeftAtIsNull(rfid)
                .map(a -> a.getSection().getUser().getUserId())
                .map(currentUserId::equals)
                .orElse(false);
    }

    public boolean isAdviserOfSectionName(String sectionName) {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        return sectionRepository
                .findBySectionNameAndSchoolYear_SchoolYearStatus(sectionName, SchoolYearStatus.active)
                .map(section -> section.getUser().getUserId())
                .map(currentUserId::equals)
                .orElse(false);
    }
}
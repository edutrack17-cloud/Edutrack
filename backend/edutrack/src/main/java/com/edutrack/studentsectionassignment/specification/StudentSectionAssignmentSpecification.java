package com.edutrack.studentsectionassignment.specification;

import com.edutrack.section.enums.GradeLevel;
import com.edutrack.student.enums.StudentStatus;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import org.springframework.data.jpa.domain.Specification;

public class StudentSectionAssignmentSpecification {

    public static Specification<StudentSectionAssignment> hasStudentStatus(StudentStatus studentStatus){
        return (root, query, criteriaBuilder) -> {
            if (studentStatus == null) return criteriaBuilder.conjunction();

            return criteriaBuilder.equal(root.get("student").get("studentStatus"), studentStatus);
        };
    }

    public static Specification<StudentSectionAssignment> hasGradeLevel(GradeLevel gradeLevel){
        return (root, query, criteriaBuilder) -> {
            if (gradeLevel == null) return criteriaBuilder.conjunction();

            return criteriaBuilder.equal(root.get("section").get("gradeLevel"), gradeLevel);
        };
    }

    public static Specification<StudentSectionAssignment> hasSection(String sectionName){
        return (root, query, criteriaBuilder) -> {
            if (sectionName == null || sectionName.isBlank()) return criteriaBuilder.conjunction();

            return criteriaBuilder.equal(root.get("section").get("sectionName"), sectionName);
        };
    }

    public static Specification<StudentSectionAssignment> isCurrent(){
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.isNull(root.get("leftAt"));
    }
}

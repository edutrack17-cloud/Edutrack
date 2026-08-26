package com.edutrack.studentsectionassignment.specification;

import com.edutrack.section.enums.GradeLevel;
import com.edutrack.student.enums.StudentStatus;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class StudentSectionAssignmentSpecification {

    //FILTER BY STUDENT STATUS
    public static Specification<StudentSectionAssignment> hasStudentStatus(StudentStatus studentStatus){
        return (root, query, criteriaBuilder) -> {
            if (studentStatus == null) return criteriaBuilder.conjunction();

            return criteriaBuilder.equal(root.get("student").get("studentStatus"), studentStatus);
        };
    }

    //FILTER BY GRADE LEVEL
    public static Specification<StudentSectionAssignment> hasGradeLevel(GradeLevel gradeLevel){
        return (root, query, criteriaBuilder) -> {
            if (gradeLevel == null) return criteriaBuilder.conjunction();

            return criteriaBuilder.equal(root.get("section").get("gradeLevel"), gradeLevel);
        };
    }

    //FILTER BY SECTION
    public static Specification<StudentSectionAssignment> hasSection(String sectionName){
        return (root, query, criteriaBuilder) -> {
            if (sectionName == null || sectionName.isBlank()) return criteriaBuilder.conjunction();

            return criteriaBuilder.equal(root.get("section").get("sectionName"), sectionName);
        };
    }

    //FILTER BY LATEST ASSIGNMENT
    public static Specification<StudentSectionAssignment> isCurrent(){
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.isNull(root.get("leftAt"));
    }

    //SEARCH NAME
    public static Specification<StudentSectionAssignment> hasStudentName(String studentName){
        return (root, query, criteriaBuilder) -> {
            if (studentName == null || studentName.isBlank()) return criteriaBuilder.conjunction();
            
            String[] studentNameParts = studentName.trim().toLowerCase().split("\\s");

            Expression<String> firstName = criteriaBuilder.lower(root.get("student").get("firstName"));
            Expression<String> middleName = criteriaBuilder.lower(root.get("student").get("middleName"));
            Expression<String> lastName = criteriaBuilder.lower(root.get("student").get("lastName"));

            List<Predicate> studentNamePredicates = new ArrayList<>();
            for (String studentNamePart : studentNameParts) {
                String pattern = "%" + studentNamePart + "%";
                Predicate partMatches = criteriaBuilder.or(
                        criteriaBuilder.like(firstName, pattern),
                        criteriaBuilder.like(middleName, pattern),
                        criteriaBuilder.like(lastName, pattern)
                );
                studentNamePredicates.add(partMatches);
            }

            return criteriaBuilder.and(
                    studentNamePredicates.toArray(new Predicate[0])
            );
        };
    }
}

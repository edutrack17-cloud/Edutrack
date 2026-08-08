package com.edutrack.student.specification;

import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.enums.SectionStatus;
import com.edutrack.student.entity.Student;
import com.edutrack.student.enums.StudentStatus;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import org.springframework.data.jpa.domain.Specification;

public class StudentSpecification {
    //GRADE LEVEL FILTER
    public static Specification<Student> hasGradeLevel(GradeLevel gradeLevel){
        return (root, query, criteriaBuilder) -> {
            if (gradeLevel == null) return  criteriaBuilder.conjunction();
            return criteriaBuilder.equal(root.get("section").get("gradeLevel"), gradeLevel);
        };
    }

    //SECTION FILTER
    public static Specification<Student> hasSectionName(String sectionName){
        return (root, query, criteriaBuilder) -> {
            if ( sectionName == null) return criteriaBuilder.conjunction();
            return criteriaBuilder.equal(criteriaBuilder.lower(root.get("section").get("sectionName")), sectionName);
        };
    }

    //STATUS FILTER
    public static Specification<Student> hasStatus(StudentStatus studentStatus){
        return (root, query, criteriaBuilder) -> {
            if (studentStatus == null) return criteriaBuilder.conjunction();
            return criteriaBuilder.equal(root.get("studentStatus"), studentStatus);
        };
    }


}

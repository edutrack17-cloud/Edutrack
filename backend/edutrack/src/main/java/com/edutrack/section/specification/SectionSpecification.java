package com.edutrack.section.specification;

import com.edutrack.schoolyear.enums.SchoolYearStatus;
import com.edutrack.section.entity.Section;
import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.enums.SectionStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

public class SectionSpecification {

    public static Specification<Section> hasName(String fullName){
        return (root, query, criteriaBuilder) -> {
            if (fullName == null) return criteriaBuilder.conjunction();

            String pattern = "%" + fullName.toLowerCase() + "%";

            Predicate firstNameSearch = criteriaBuilder.like(criteriaBuilder.lower(root.get("user").get("firstName")), pattern);
            Predicate middleNameSearch = criteriaBuilder.like(criteriaBuilder.lower(root.get("user").get("middleName")), pattern);
            Predicate lastNameSearch = criteriaBuilder.like(criteriaBuilder.lower(root.get("user").get("lastName")), pattern);

            return criteriaBuilder.or(firstNameSearch, middleNameSearch, lastNameSearch);
        };
    }

    public static Specification<Section> hasStatus(SectionStatus sectionStatus){
        return (root, query, criteriaBuilder) -> {
            if (sectionStatus == null) return criteriaBuilder.conjunction();

            return criteriaBuilder.equal(root.get("sectionStatus"), sectionStatus);
        };
    }

    public static Specification<Section> hasGradeLevel(GradeLevel gradeLevel){
        return (root, query, criteriaBuilder) -> {
            if (gradeLevel == null) return criteriaBuilder.conjunction();

            return criteriaBuilder.equal(root.get("gradeLevel"), gradeLevel);
        };
    }

    public static Specification<Section> hasSchoolYearStatus(){
        return (root, query, criteriaBuilder) -> {
            return criteriaBuilder.equal(root.get("schoolYear").get("schoolYearStatus"), SchoolYearStatus.active);
        };
    }
}

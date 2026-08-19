package com.edutrack.section.specification;

import com.edutrack.schoolyear.enums.SchoolYearStatus;
import com.edutrack.section.entity.Section;
import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.enums.SectionStatus;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

public class SectionSpecification {

    public static Specification<Section> hasSectionName(String sectionName){
        return (root, query, criteriaBuilder) -> {
            if (sectionName == null) return criteriaBuilder.conjunction();
            String pattern = "%" + sectionName.toLowerCase() + "%";

            return criteriaBuilder.like(criteriaBuilder.lower(root.get("sectionName")), pattern);
        };
    }

    public static Specification<Section> hasName(String fullName){
        return (root, query, criteriaBuilder) -> {
            if (fullName == null) return criteriaBuilder.conjunction();

            String pattern = "%" + fullName.toLowerCase() + "%";

            Expression<String> concatenatedName = criteriaBuilder.concat(
                    criteriaBuilder.concat(
                            criteriaBuilder.concat(
                                    criteriaBuilder.lower(root.get("user").get("firstName")), " "),
                            criteriaBuilder.lower(root.get("user").get("middleName"))),
                    " ");

            concatenatedName = criteriaBuilder.concat(concatenatedName,
                    criteriaBuilder.lower(root.get("user").get("lastName")));

            return criteriaBuilder.like(concatenatedName, pattern);
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

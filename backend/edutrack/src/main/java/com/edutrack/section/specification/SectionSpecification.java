package com.edutrack.section.specification;

import com.edutrack.schoolyear.enums.SchoolYearStatus;
import com.edutrack.section.entity.Section;
import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.enums.SectionStatus;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import org.aspectj.weaver.ast.Expr;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class SectionSpecification {

    public static Specification<Section> hasSectionName(String sectionName){
        return (root, query, criteriaBuilder) -> {
            if (sectionName == null) return criteriaBuilder.conjunction();
            String pattern = "%" + sectionName.toLowerCase() + "%";

            return criteriaBuilder.like(criteriaBuilder.lower(root.get("sectionName")), pattern);
        };
    }

    public static Specification<Section> hasAdviserName(String name) {
        return (root, query, criteriaBuilder) -> {

            if (name == null || name.isBlank()) {
                return criteriaBuilder.conjunction();
            }

            String[] nameParts = name.trim()
                    .toLowerCase()
                    .split("\\s+");

            Expression<String> firstName =
                    criteriaBuilder.lower(root.get("user").get("firstName"));

            Expression<String> middleName =
                    criteriaBuilder.lower(root.get("user").get("middleName"));

            Expression<String> lastName =
                    criteriaBuilder.lower(root.get("user").get("lastName"));

            List<Predicate> namePredicates = new ArrayList<>();

            for (String namePart : nameParts) {

                String pattern = "%" + namePart + "%";

                Predicate partMatches = criteriaBuilder.or(
                        criteriaBuilder.like(firstName, pattern),
                        criteriaBuilder.like(middleName, pattern),
                        criteriaBuilder.like(lastName, pattern)
                );

                namePredicates.add(partMatches);
            }

            return criteriaBuilder.and(
                    namePredicates.toArray(new Predicate[0])
            );
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

    // SectionSpecification.java
    public static Specification<Section> hasAdviserId(Long userId) {
        return (root, query, criteriaBuilder) -> {
            if (userId == null) return criteriaBuilder.conjunction();
            return criteriaBuilder.equal(root.get("user").get("userId"), userId);
        };
    }
}

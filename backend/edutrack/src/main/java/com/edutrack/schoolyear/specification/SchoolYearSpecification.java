package com.edutrack.schoolyear.specification;

import com.edutrack.schoolyear.entity.SchoolYear;
import com.edutrack.schoolyear.enums.SchoolYearStatus;
import org.springframework.data.jpa.domain.Specification;

public class SchoolYearSpecification {

    public static Specification<SchoolYear> hasName(String schoolYearName){
        return (root, query, criteriaBuilder) -> {
            if (schoolYearName == null) return criteriaBuilder.conjunction();

            return criteriaBuilder.like(criteriaBuilder.lower(root.get("schoolYearName")), "%" +schoolYearName.toLowerCase()+ "%");
        };
    }

    public static Specification<SchoolYear> hasStatus(SchoolYearStatus schoolYearStatus){
        return (root, query, criteriaBuilder) -> {
            if (schoolYearStatus == null) return  criteriaBuilder.conjunction();

            return criteriaBuilder.equal(root.get("schoolYearStatus"), schoolYearStatus);
        };
    }
}

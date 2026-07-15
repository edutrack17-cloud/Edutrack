package com.edutrack.section.specification;

import com.edutrack.section.entity.Section;
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
}

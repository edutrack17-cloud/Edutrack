package com.edutrack.user.specification;

import com.edutrack.user.entity.User;
import com.edutrack.user.enums.AccountStatus;
import com.edutrack.user.enums.UserRole;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class UserSpecification {
    public static Specification<User> notAnAdmin(){
        return (root, query, criteriaBuilder) -> criteriaBuilder.notEqual(root.get("userRole"), UserRole.admin);
    }

    public static Specification<User> hasStatus(AccountStatus accountStatus){
        return (root, query, criteriaBuilder) -> {
            if (accountStatus == null) return criteriaBuilder.conjunction();

            return criteriaBuilder.equal(root.get("accountStatus"), accountStatus);
        };
    }

    public static Specification<User> searchField(String searchEntry) {
        return (root, query, criteriaBuilder) -> {

            if (searchEntry == null || searchEntry.isBlank()) {
                return criteriaBuilder.conjunction();
            }

            String[] nameParts = searchEntry.trim()
                    .toLowerCase()
                    .split("\\s+");

            Expression<String> firstName =
                    criteriaBuilder.lower(root.get("firstName"));

            Expression<String> middleName =
                    criteriaBuilder.lower(root.get("middleName"));

            Expression<String> lastName =
                    criteriaBuilder.lower(root.get("lastName"));

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
}

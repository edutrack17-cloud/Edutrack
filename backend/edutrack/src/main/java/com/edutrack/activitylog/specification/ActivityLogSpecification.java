package com.edutrack.activitylog.specification;

import com.edutrack.activitylog.entity.ActivityLog;
import org.springframework.data.jpa.domain.Specification;

public class ActivityLogSpecification {

    public static Specification<ActivityLog> hasHeader(String logHeader){
        return (root, query, criteriaBuilder) -> {
            if (logHeader == null) return criteriaBuilder.conjunction();
            return criteriaBuilder.like(root.get("logHeader"), logHeader);
        };
    }
}

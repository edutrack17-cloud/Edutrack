package com.edutrack.activitylog.specification;

import com.edutrack.activitylog.entity.ActivityLog;
import org.springframework.data.jpa.domain.Specification;

public class ActivityLogSpecification {

    /**
     * Filters activity logs by logHeader.
     *
     * Previously this used:
     *   criteriaBuilder.like(root.get("logHeader"), logHeader)
     * with no wildcards. In SQL, LIKE without % is equivalent to an exact,
     * case-SENSITIVE match - so any tiny drift between the string the
     * frontend sends (e.g. "STUDENT ENROLLED") and the string stored by
     * ActivityLogService.createLogRecord(...) (same header, but potentially
     * with different casing/whitespace) produced zero rows. That was the
     * filter-not-working bug.
     *
     * New behavior:
     *   - null OR blank  -> no filter (conjunction), so ?logHeader= can't
     *                       silently produce LIKE '%%' surprises elsewhere
     *   - otherwise      -> case-insensitive, whitespace-trimmed, exact
     *                       match against the stored log_header
     *
     * Exact (not %contains%) is deliberate: this is a fixed-value dropdown
     * filter, not free-text search. If you ever want partial matching, add
     * "%" + ... + "%" around the pattern below.
     */
    public static Specification<ActivityLog> hasHeader(String logHeader) {
        return (root, query, criteriaBuilder) -> {
            if (logHeader == null || logHeader.isBlank()) {
                return criteriaBuilder.conjunction();
            }

            String normalized = logHeader.trim().toLowerCase();

            return criteriaBuilder.equal(
                    criteriaBuilder.lower(root.get("logHeader")),
                    normalized
            );
        };
    }
}
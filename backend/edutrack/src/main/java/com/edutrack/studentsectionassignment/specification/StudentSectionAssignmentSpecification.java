package com.edutrack.studentsectionassignment.specification;

import com.edutrack.schoolyear.enums.SchoolYearStatus;
import com.edutrack.section.enums.GradeLevel;
import com.edutrack.student.enums.StudentStatus;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;

public class StudentSectionAssignmentSpecification {

    // FILTER BY STUDENT STATUS
    public static Specification<StudentSectionAssignment> hasStudentStatus(
            StudentStatus studentStatus
    ) {
        return (root, query, criteriaBuilder) -> {
            if (studentStatus == null) {
                return criteriaBuilder.conjunction();
            }

            return criteriaBuilder.equal(
                    root.get("student").get("studentStatus"),
                    studentStatus
            );
        };
    }

    // FILTER BY GRADE LEVEL
    public static Specification<StudentSectionAssignment> hasGradeLevel(
            GradeLevel gradeLevel
    ) {
        return (root, query, criteriaBuilder) -> {
            if (gradeLevel == null) {
                return criteriaBuilder.conjunction();
            }

            return criteriaBuilder.equal(
                    root.get("section").get("gradeLevel"),
                    gradeLevel
            );
        };
    }

    // FILTER BY SECTION - CASE INSENSITIVE
    public static Specification<StudentSectionAssignment> hasSection(
            String sectionName
    ) {
        return (root, query, criteriaBuilder) -> {
            if (sectionName == null || sectionName.isBlank()) {
                return criteriaBuilder.conjunction();
            }

            return criteriaBuilder.equal(
                    criteriaBuilder.lower(
                            root.get("section").get("sectionName")
                    ),
                    sectionName.trim().toLowerCase()
            );
        };
    }

    // FILTER BY ACTIVE SCHOOL YEAR SECTION
    // Convenience wrapper — equivalent to
    // hasSchoolYearStatusIn(Set.of(SchoolYearStatus.active)).
    public static Specification<StudentSectionAssignment> hasActiveSchoolYear() {
        return hasSchoolYearStatusIn(Set.of(SchoolYearStatus.active));
    }

    // FILTER BY SCHOOL YEAR STATUS SET
    // planning / active / closed / archived — pass whichever subset you
    // want. Null or empty collection means "no filter" (conjunction),
    // matching the rest of the class's optional-filter convention.
    public static Specification<StudentSectionAssignment> hasSchoolYearStatusIn(
            Collection<SchoolYearStatus> statuses
    ) {
        return (root, query, criteriaBuilder) -> {
            if (statuses == null || statuses.isEmpty()) {
                return criteriaBuilder.conjunction();
            }
            return root.get("section").get("schoolYear").get("schoolYearStatus")
                    .in(statuses);
        };
    }

    // FILTER BY CURRENT ASSIGNMENT
    public static Specification<StudentSectionAssignment> isCurrent() {
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.isNull(root.get("leftAt"));
    }

    // LATEST ASSIGNMENT PER STUDENT (active or historical)
    public static Specification<StudentSectionAssignment> isLatestAssignment() {
        return (root, query, criteriaBuilder) -> {
            Subquery<Long> subquery = query.subquery(Long.class);
            Root<StudentSectionAssignment> subRoot = subquery.from(StudentSectionAssignment.class);

            subquery.select(criteriaBuilder.max(subRoot.get("assignmentId")))
                    .where(criteriaBuilder.equal(subRoot.get("student"), root.get("student")));

            return criteriaBuilder.equal(root.get("assignmentId"), subquery);
        };
    }

    // SEARCH NAME - CASE INSENSITIVE
    public static Specification<StudentSectionAssignment> hasStudentName(
            String studentName
    ) {
        return (root, query, criteriaBuilder) -> {
            if (studentName == null || studentName.isBlank()) {
                return criteriaBuilder.conjunction();
            }

            String[] studentNameParts =
                    studentName.trim().toLowerCase().split("\\s+");

            Expression<String> firstName =
                    criteriaBuilder.lower(
                            root.get("student").get("firstName")
                    );

            Expression<String> middleName =
                    criteriaBuilder.lower(
                            root.get("student").get("middleName")
                    );

            Expression<String> lastName =
                    criteriaBuilder.lower(
                            root.get("student").get("lastName")
                    );

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

    // SEARCH BY STUDENT NAME OR LRN - CASE INSENSITIVE
    public static Specification<StudentSectionAssignment> matchesSearch(
            String search
    ) {
        return (root, query, criteriaBuilder) -> {
            if (search == null || search.isBlank()) {
                return criteriaBuilder.conjunction();
            }

            String trimmedSearch = search.trim().toLowerCase();

            Expression<String> lrn =
                    criteriaBuilder.lower(
                            root.get("student").get("lrn")
                    );

            Predicate lrnMatches = criteriaBuilder.like(
                    lrn,
                    "%" + trimmedSearch + "%"
            );

            String[] studentNameParts = trimmedSearch.split("\\s+");

            Expression<String> firstName =
                    criteriaBuilder.lower(root.get("student").get("firstName"));
            Expression<String> middleName =
                    criteriaBuilder.lower(root.get("student").get("middleName"));
            Expression<String> lastName =
                    criteriaBuilder.lower(root.get("student").get("lastName"));

            List<Predicate> studentNamePredicates = new ArrayList<>();

            for (String part : studentNameParts) {
                String pattern = "%" + part + "%";
                studentNamePredicates.add(
                        criteriaBuilder.or(
                                criteriaBuilder.like(firstName, pattern),
                                criteriaBuilder.like(middleName, pattern),
                                criteriaBuilder.like(lastName, pattern)
                        )
                );
            }

            Predicate nameMatches = criteriaBuilder.and(
                    studentNamePredicates.toArray(new Predicate[0])
            );

            return criteriaBuilder.or(nameMatches, lrnMatches);
        };
    }

    // FILTER BY ADVISER
    public static Specification<StudentSectionAssignment> hasAdviserId(Long adviserId) {
        return (root, query, criteriaBuilder) -> {
            if (adviserId == null) {
                return criteriaBuilder.conjunction();
            }
            return criteriaBuilder.equal(root.get("section").get("user").get("userId"), adviserId);
        };
    }

    // FILTER BY SCHOOL YEAR
    public static Specification<StudentSectionAssignment> hasSchoolYear(Long schoolYearId) {
        return (root, query, criteriaBuilder) -> {
            if (schoolYearId == null) {
                return criteriaBuilder.conjunction();
            }

            return criteriaBuilder.equal(
                    root.get("section").get("schoolYear").get("schoolYearId"),
                    schoolYearId
            );
        };
    }
}
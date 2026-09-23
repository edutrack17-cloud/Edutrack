package com.edutrack.attendance.specification;

import com.edutrack.attendance.entity.Attendance;
import com.edutrack.attendance.enums.AttendanceStatus;
import com.edutrack.schoolyear.enums.SchoolYearStatus;
import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.enums.SectionStatus;
import com.edutrack.student.enums.StudentStatus;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class AttendanceSpecification {

    public static Specification<Attendance> hasStatus(AttendanceStatus status) {
        return (root, query, cb) -> status == null
                ? cb.conjunction()
                : cb.equal(root.get("attendanceStatus"), status);
    }

    public static Specification<Attendance> hasGradeLevel(GradeLevel gradeLevel) {
        return (root, query, cb) -> gradeLevel == null
                ? cb.conjunction()
                : cb.equal(
                root.get("studentSectionAssignment").get("section").get("gradeLevel"),
                gradeLevel
        );
    }

    public static Specification<Attendance> createdBetween(LocalDate start, LocalDate end) {
        return (root, query, cb) -> (start == null || end == null)
                ? cb.conjunction()
                : cb.between(root.get("createdAt"), start, end);
    }

    public static Specification<Attendance> isIncomplete() {
        return (root, query, cb) -> cb.and(
                cb.isNotNull(root.get("dateTimeIn")),
                cb.isNull(root.get("dateTimeOut"))
        );
    }

    public static Specification<Attendance> studentIsEnrolled() {
        return (root, query, cb) -> cb.equal(
                root.get("studentSectionAssignment").get("student").get("studentStatus"),
                StudentStatus.enrolled
        );
    }

    /**
     * Attendance rows whose section does NOT belong to a school year that
     * has been closed. Planning / active / archived school years are all
     * still visible; only `closed` is excluded.
     */
    public static Specification<Attendance> schoolYearIsNotClosed() {
        return (root, query, cb) -> cb.notEqual(
                root.get("studentSectionAssignment")
                        .get("section")
                        .get("schoolYear")
                        .get("schoolYearStatus"),
                SchoolYearStatus.closed
        );
    }

    public static Specification<Attendance> hasSection(Integer sectionId) {
        return (root, query, cb) -> sectionId == null
                ? cb.conjunction()
                : cb.equal(root.get("studentSectionAssignment").get("section").get("sectionId"), sectionId);
    }

    public static Specification<Attendance> hasAssignment(Long assignmentId) {
        return (root, query, cb) ->
                cb.equal(
                        root.get("studentSectionAssignment").get("assignmentId"),
                        assignmentId
                );
    }

    public static Specification<Attendance> hasAssignmentIn(List<Long> assignmentIds) {
        return (root, query, cb) ->
                root.get("studentSectionAssignment").get("assignmentId").in(assignmentIds);
    }

    public static Specification<Attendance> createdToday(LocalDate today) {
        return (root, query, cb) ->
                cb.equal(root.get("createdAt"), today);
    }

    public static Specification<Attendance> timeInBetween(
            LocalDateTime startOfDay,
            LocalDateTime startOfNextDay
    ) {
        return (root, query, cb) ->
                cb.and(
                        cb.greaterThanOrEqualTo(root.get("dateTimeIn"), startOfDay),
                        cb.lessThan(root.get("dateTimeIn"), startOfNextDay)
                );
    }

    /**
     * Attendance rows whose section is advised by {@code userId}.
     * When {@code sectionStatus} is provided, only sections in that status match —
     * this is what keeps a teacher's read scoped to their CURRENT active advisory,
     * not sections they used to advise in previous school years.
     */
    public static Specification<Attendance> isAdvisedBy(Long userId, SectionStatus sectionStatus) {
        return (root, query, cb) -> {
            if (userId == null) return cb.conjunction();

            var section = root.get("studentSectionAssignment").get("section");

            var advisedByUser = cb.equal(section.get("user").get("userId"), userId);

            if (sectionStatus == null) {
                return advisedByUser;
            }
            return cb.and(advisedByUser, cb.equal(section.get("sectionStatus"), sectionStatus));
        };
    }

    /** Convenience overload for callers that only want the adviser match. */
    public static Specification<Attendance> isAdvisedBy(Long userId) {
        return isAdvisedBy(userId, null);
    }

    public static Specification<Attendance> hasSectionIn(List<Integer> sectionIds) {
        return (root, query, cb) -> (sectionIds == null || sectionIds.isEmpty())
                ? cb.disjunction()
                : root.get("studentSectionAssignment").get("section").get("sectionId").in(sectionIds);
    }
}
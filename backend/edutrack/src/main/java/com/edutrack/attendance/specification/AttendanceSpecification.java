package com.edutrack.attendance.specification;

import com.edutrack.attendance.entity.Attendance;
import com.edutrack.attendance.enums.AttendanceStatus;
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

    public static Specification<Attendance> hasSection(Integer sectionId) {
        return (root, query, cb) -> sectionId == null
                ? cb.conjunction()
                : cb.equal(root.get("studentSectionAssignment").get("section").get("sectionId"), sectionId);
    }

    public static Specification<Attendance> hasAssignment(Long assignmentId){
        return (root, query, criteriaBuilder) ->
            criteriaBuilder.equal(
                    root.get("studentSectionAssignment").get("assignmentId"),
                    assignmentId
            );
    }

    public static Specification<Attendance> hasAssignmentIn(List<Long> assignmentIds){
        return (root, query, criteriaBuilder) ->
                root.get("studentSectionAssignment").get("assignmentId").in(assignmentIds);
    }

    public static Specification<Attendance> createdToday(LocalDate today){
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("createdAt"), today);
    }

    public static Specification<Attendance> timeInBetween(
            LocalDateTime startOfDay,
            LocalDateTime startOfNextDay
    ){
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.and(
                        criteriaBuilder.greaterThanOrEqualTo(root.get("dateTimeIn"), startOfDay),
                        criteriaBuilder.lessThan(root.get("dateTimeIn"), startOfNextDay)
                );
    }
}

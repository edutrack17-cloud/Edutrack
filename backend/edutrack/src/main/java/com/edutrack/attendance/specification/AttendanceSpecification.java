package com.edutrack.attendance.specification;

import com.edutrack.attendance.entity.Attendance;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class AttendanceSpecification {


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

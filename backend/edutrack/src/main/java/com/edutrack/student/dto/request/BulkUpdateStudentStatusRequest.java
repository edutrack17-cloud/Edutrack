package com.edutrack.student.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record BulkUpdateStudentStatusRequest(
        @NotEmpty
        @Valid
        List<StudentEntry> students,

        LocalDate leftAt
) {
    public record StudentEntry(
            @NotNull
            Long studentId,
            String remarks
    ) {}

    /**
     * Convenience accessor used by the @PreAuthorize SpEL on the bulk
     * endpoints: #bulkRequest.studentIds() must resolve to a List<Long> so
     * StudentAccessService.isAdviserOfAllStudents(...) can be reused as-is.
     *
     * Without this method, the SpEL fails to evaluate for a TEACHER account
     * (admin short-circuits the || and never hits it), and the request
     * surfaces as a 500 instead of 200/403.
     */
    public List<Long> studentIds() {
        return students == null
                ? List.of()
                : students.stream()
                .map(StudentEntry::studentId)
                .toList();
    }
}
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
    /**
     * One entry per student in the bulk request. remarks is optional at the
     * individual level — a blank/null value means "no remark for this student",
     * which is exactly how the single-status endpoint behaves today.
     */
    public record StudentEntry(
            @NotNull
            Long studentId,
            String remarks
    ) {}
}
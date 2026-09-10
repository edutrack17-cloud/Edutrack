package com.edutrack.student.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record BulkEnrollStudentRequest(
        @NotEmpty
        @Valid
        List<CreateStudentRequest> students
) {}
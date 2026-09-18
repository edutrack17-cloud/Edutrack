package com.edutrack.section.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CloneSectionBatchRequest(
        @NotNull Long targetSchoolYearId,
        @NotNull List<@Valid CloneSectionRequest> sections
) {}
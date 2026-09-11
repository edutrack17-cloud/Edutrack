package com.edutrack.schoolform.dto.request;

import java.time.YearMonth;

public record SF2ReportRequest(
        Integer sectionId,
        YearMonth period
) {}
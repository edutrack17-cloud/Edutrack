package com.edutrack.schoolform.dto.request;

import java.time.YearMonth;

public record SF2TableRequest(
        Integer sectionId,
        Long schoolYearId,
        YearMonth period
) {}
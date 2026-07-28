package com.edutrack.schoolyear.dto.request;

import com.edutrack.schoolyear.enums.SchoolYearStatus;


import java.time.LocalDate;

public record UpdateSchoolYearRequest(
        String schoolYearName,
        LocalDate startDate,
        LocalDate endDate
) {}

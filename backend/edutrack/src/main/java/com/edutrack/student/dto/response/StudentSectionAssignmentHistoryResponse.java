package com.edutrack.student.dto.response;

import com.edutrack.section.enums.GradeLevel;
import com.edutrack.studentsectionassignment.enums.ExitType;

import java.time.LocalDate;

public record StudentSectionAssignmentHistoryResponse(
        String sectionName,
        GradeLevel gradeLevel,
        LocalDate assignedAt,
        LocalDate leftAt,
        ExitType exitType,
        String remarks
) {}
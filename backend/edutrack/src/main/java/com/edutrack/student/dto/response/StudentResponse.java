package com.edutrack.student.dto.response;

import com.edutrack.student.enums.StudentStatus;

import java.time.LocalDate;

public record StudentResponse(
        String lrn,
        String fullName,
        LocalDate birthDate,
        String guardian,
        String guardianPhoneNumber,
        String sectionName,
        String rfid,
        StudentStatus studentStatus
) {
}

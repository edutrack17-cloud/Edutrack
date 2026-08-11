package com.edutrack.student.dto.request;

import com.edutrack.student.enums.AdmissionType;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;

public record UpdateStudentRequest(
        String firstName,
        String middleName,
        String lastName,
        String lrn,
        String rfid,
        String guardian,
        String guardianPhoneNumber,
        AdmissionType admissionType,
        LocalDate birthDate,
        @Positive Integer sectionId
) {}

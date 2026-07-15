package com.edutrack.student.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateStudentRequest(
        @NotBlank
        @Size(max = 15)
        String lrn,

        @NotBlank
        @Size(max = 100)
        String firstName,

        @Size(max = 100)
        String middleName,

        @NotBlank
        @Size(max = 100)
        String lastName,

        LocalDate birthDate,

        @NotBlank
        @Size(max = 100)
        String guardian,

        @NotBlank
        @Size(max = 11)
        String guardianPhoneNumber,

        @NotNull
        Integer sectionId,

        @NotBlank
        @Size(max = 255)
        String rfid
) {}

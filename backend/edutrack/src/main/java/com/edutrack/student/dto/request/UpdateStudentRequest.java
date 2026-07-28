package com.edutrack.student.dto.request;

import java.time.LocalDate;

public record UpdateStudentRequest(
   String firstName,
   String middleName,
   String lastName,
   String lrn,
   String rfid,
   String guardian,
   String guardianPhoneNumber,
   LocalDate birthDate
) {}

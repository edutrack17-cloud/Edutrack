package com.edutrack.student.dto.response;

import com.edutrack.student.enums.AdmissionType;
import com.edutrack.student.enums.Sex;
import com.edutrack.student.enums.StudentStatus;

import java.time.LocalDate;

public record StudentEditResponse(
   Long studentId,
   String lrn,
   String fullName,
   Sex sex,
   LocalDate birthDate,
   String guardian,
   String guardianPhoneNumber,
   String rfid,
   StudentStatus studentStatus,
   AdmissionType admissionType,
   String gradeAndSection
) {}

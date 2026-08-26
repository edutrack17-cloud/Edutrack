package com.edutrack.student.controller;

import com.edutrack.section.enums.GradeLevel;
import com.edutrack.student.dto.request.*;
import com.edutrack.student.dto.response.StudentEditResponse;
import com.edutrack.student.dto.response.StudentResponse;
import com.edutrack.student.enums.StudentStatus;
import com.edutrack.student.service.StudentService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/student")
public class StudentController {
    private final StudentService studentService;

    public StudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    //ENROLL STUDENT
    @PostMapping
    public ResponseEntity<StudentResponse> enrollStudent(@Valid @RequestBody CreateStudentRequest studentRequest){
        StudentResponse enrolledStudent = studentService.enrollStudent(studentRequest);
        return ResponseEntity
                .ok(enrolledStudent);
    }

    //READ
    @GetMapping
    public ResponseEntity<Page<StudentResponse>> getStudents(@RequestParam(required = false) GradeLevel gradeLevel,
                                                             @RequestParam(required = false) String sectionName,
                                                             @RequestParam(required = false) StudentStatus studentStatus,
                                                             @RequestParam(required = false) String studentName,
                                                             Pageable pageable){
        return ResponseEntity
                .ok(studentService.getStudents(gradeLevel, sectionName, studentStatus, studentName, pageable));
    }

    //UPDATE
    @PatchMapping("{studentId}")
    public ResponseEntity<StudentEditResponse> updateStudent(@PathVariable Long studentId, @RequestBody UpdateStudentRequest updateStudentRequest){
        StudentEditResponse updatedStudent = studentService.updateStudent(studentId, updateStudentRequest);
        return ResponseEntity.ok(updatedStudent);
    }

    //DROP STUDENT
    @PatchMapping("{studentId}/student-status/drop")
    public ResponseEntity<StudentEditResponse> dropStudent(@PathVariable Long studentId, @RequestBody UpdateStudentStatusRequest updateStudentStatusRequest){
        StudentEditResponse droppedStudent = studentService.dropStudent(studentId, updateStudentStatusRequest);
        return ResponseEntity.ok(droppedStudent);
    }

    //TRANSFER OUT STUDENT
    @PatchMapping("{studentId}/student-status/transfer-out")
    public ResponseEntity<StudentEditResponse> transferOutStudent(@PathVariable Long studentId, @RequestBody UpdateStudentStatusRequest updateStudentStatusRequest){
        StudentEditResponse transferredOutStudent = studentService.transferOutStudent(studentId, updateStudentStatusRequest);
        return ResponseEntity.ok(transferredOutStudent);
    }

    //GRADUATE STUDENT
    @PatchMapping("{studentId}/student-status/graduate")
    public ResponseEntity<StudentEditResponse> graduateStudent(@PathVariable Long studentId, @RequestBody UpdateStudentStatusRequest updateStudentStatusRequest){
        StudentEditResponse graduatedStudent = studentService.graduateStudent(studentId, updateStudentStatusRequest);
        return ResponseEntity.ok(graduatedStudent);
    }

    //BULK PROMOTE
    @PatchMapping("/grade-level/promote")
    public ResponseEntity<List<StudentResponse>> promoteStudents(@RequestBody BulkPromotionRequest promotionRequest){
        List<StudentResponse> promotedStudents = studentService.promoteStudents(promotionRequest);
        return ResponseEntity.ok(promotedStudents);
    }

    //SECTION TRANSFER
    @PatchMapping("{studentId}/section-assignment/transfer")
    public ResponseEntity<StudentEditResponse> transferStudent(@PathVariable Long studentId, @RequestBody TransferSectionRequest transferSectionRequest){
        StudentEditResponse newStudentSection = studentService.transferStudent(studentId, transferSectionRequest);
        return ResponseEntity.ok(newStudentSection);
    }
}

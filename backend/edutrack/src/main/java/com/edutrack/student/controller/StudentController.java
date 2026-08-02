package com.edutrack.student.controller;

import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.enums.SectionStatus;
import com.edutrack.student.dto.request.CreateStudentRequest;
import com.edutrack.student.dto.request.UpdateStudentRequest;
import com.edutrack.student.dto.response.StudentResponse;
import com.edutrack.student.enums.StudentStatus;
import com.edutrack.student.service.StudentService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
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
                                                             Pageable pageable){
        return ResponseEntity
                .ok(studentService.getStudents(gradeLevel, sectionName, studentStatus, pageable));
    }
}

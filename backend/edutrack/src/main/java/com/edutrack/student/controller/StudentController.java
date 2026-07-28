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

    //CREATE
    @PostMapping
    public ResponseEntity<StudentResponse> createStudent(@Valid @RequestBody CreateStudentRequest studentRequest){
       StudentResponse savedStudent = studentService.createStudent(studentRequest);
       return ResponseEntity.status(HttpStatus.CREATED).body(savedStudent);
    }


    //READ
    @GetMapping
    public ResponseEntity<Page<StudentResponse>> getStudents(@RequestParam(required = false) GradeLevel gradeLevel,
                                                             @RequestParam(required = false) String sectionName,
                                                             @RequestParam(required = false) StudentStatus studentStatus,
                                                             Pageable pageable){
        return ResponseEntity.ok(studentService.getStudents(gradeLevel, sectionName, studentStatus, pageable));
    }

    //UPDATE
    @PatchMapping("{studentId}")
    public ResponseEntity<StudentResponse> updateStudent(@PathVariable Long studentId, @RequestBody UpdateStudentRequest updateStudentRequest){
        StudentResponse updatedStudent = studentService.updateStudent(studentId, updateStudentRequest);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(updatedStudent);
    }
}

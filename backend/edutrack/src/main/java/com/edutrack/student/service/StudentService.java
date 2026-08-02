package com.edutrack.student.service;

import com.edutrack.section.entity.Section;
import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.enums.SectionStatus;
import com.edutrack.section.exception.SectionNotFound;
import com.edutrack.section.mapper.SectionMapper;
import com.edutrack.section.repository.SectionRepository;
import com.edutrack.section.service.SectionService;
import com.edutrack.shared.exception.NoChangesDetected;
import com.edutrack.student.dto.request.CreateStudentRequest;
import com.edutrack.student.dto.request.UpdateStudentRequest;
import com.edutrack.student.dto.response.StudentResponse;
import com.edutrack.student.entity.Student;
import com.edutrack.student.enums.StudentStatus;
import com.edutrack.student.exception.RFIDAlreadyExists;
import com.edutrack.student.exception.StudentAlreadyExists;
import com.edutrack.student.exception.StudentNotFound;
import com.edutrack.student.mapper.StudentMapper;
import com.edutrack.student.repository.StudentRepository;
import com.edutrack.student.specification.StudentSpecification;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import com.edutrack.studentsectionassignment.repository.StudentSectionAssignmentRepository;
import com.edutrack.studentsectionassignment.specification.StudentSectionAssignmentSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class StudentService {
    private final StudentRepository studentRepository;
    private final StudentMapper studentMapper;
    private final SectionRepository sectionRepository;
    private final StudentSectionAssignmentRepository studentSectionAssignmentRepository;
    private final SectionService sectionService;

    private Section getBySectionId(int sectionId){
        return sectionRepository.findById(sectionId).orElseThrow(() -> new SectionNotFound(sectionId));
    }

    public StudentService(StudentRepository studentRepository,
                          StudentMapper studentMapper,
                          SectionRepository sectionRepository,
                          SectionService sectionService,
                          StudentSectionAssignmentRepository studentSectionAssignmentRepository) {
        this.studentRepository = studentRepository;
        this.studentMapper = studentMapper;
        this.sectionRepository = sectionRepository;
        this.sectionService = sectionService;
        this.studentSectionAssignmentRepository = studentSectionAssignmentRepository;
    }

    //ENROLL STUDENT
    @Transactional
    public StudentResponse enrollStudent(CreateStudentRequest studentRequest){
       Section sectionToBeAssigned = getBySectionId(studentRequest.sectionId());

        if (studentRepository.existsByLrn(studentRequest.lrn())){
            throw new StudentAlreadyExists(studentRequest.lrn());
        }

        if (studentRepository.existsByRfid(studentRequest.rfid())){
            throw new RFIDAlreadyExists();
        }

       //STUDENT CREATION
       Student requestToEntity = studentMapper.toEntity(studentRequest);
       Student savedStudent = studentRepository.save(requestToEntity);

       //SECTION ASSIGNMENT
       StudentSectionAssignment assignmentToCreate = new StudentSectionAssignment();
       assignmentToCreate.setStudent(savedStudent);
       assignmentToCreate.setSection(sectionToBeAssigned);
       studentSectionAssignmentRepository.save(assignmentToCreate);

       return studentMapper.toStudentResponseDTO(savedStudent, sectionToBeAssigned);
    }

    //READ
    public Page<StudentResponse> getStudents(GradeLevel gradeLevel,
                                             String sectionName,
                                             StudentStatus studentStatus,
                                             Pageable pageable){

        Specification<StudentSectionAssignment> filters = Specification
                .where(StudentSectionAssignmentSpecification.hasGradeLevel(gradeLevel))
                .and(StudentSectionAssignmentSpecification.hasSection(sectionName))
                .and(StudentSectionAssignmentSpecification.hasStudentStatus(studentStatus));

        return studentSectionAssignmentRepository
                .findAll(filters, pageable)
                .map(assignment ->
                        studentMapper.toStudentResponseDTO(
                                assignment.getStudent(),
                                assignment.getSection()
                        ));
    }

}

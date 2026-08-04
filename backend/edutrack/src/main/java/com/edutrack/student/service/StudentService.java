package com.edutrack.student.service;

import com.edutrack.section.entity.Section;
import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.exception.SectionNotFound;
import com.edutrack.section.repository.SectionRepository;
import com.edutrack.section.service.SectionService;
import com.edutrack.shared.exception.NoChangesDetected;
import com.edutrack.student.dto.request.CreateStudentRequest;
import com.edutrack.student.dto.request.UpdateStudentRequest;
import com.edutrack.student.dto.response.StudentEditResponse;
import com.edutrack.student.dto.response.StudentResponse;
import com.edutrack.student.entity.Student;
import com.edutrack.student.enums.StudentStatus;
import com.edutrack.student.exception.RFIDAlreadyExists;
import com.edutrack.student.exception.StudentAlreadyDropped;
import com.edutrack.student.exception.StudentAlreadyExists;
import com.edutrack.student.exception.StudentNotFound;
import com.edutrack.student.mapper.StudentMapper;
import com.edutrack.student.repository.StudentRepository;
import com.edutrack.student.dto.request.DropStudentRequest;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import com.edutrack.studentsectionassignment.enums.ExitType;
import com.edutrack.studentsectionassignment.exception.SectionAssignmentNotFound;
import com.edutrack.studentsectionassignment.repository.StudentSectionAssignmentRepository;
import com.edutrack.studentsectionassignment.specification.StudentSectionAssignmentSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

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

    private Student getByStudentId(Long studentId){
        return studentRepository.findById(studentId).orElseThrow(() -> new StudentNotFound(studentId));
    }

    private StudentSectionAssignment getByAssignmentStudentId(Long studentId){
        return studentSectionAssignmentRepository.findByStudent_StudentIdAndLeftAtIsNull(studentId).orElseThrow(() -> new SectionAssignmentNotFound(studentId));
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

    //UPDATE
    @Transactional
    public StudentEditResponse updateStudent(Long studentId, UpdateStudentRequest updateStudentRequest){
        Student studentToUpdate = getByStudentId(studentId);
        String middleName = updateStudentRequest.middleName();
        boolean fieldsChanged = false;

        if (updateStudentRequest.firstName() != null &&
            !updateStudentRequest.firstName().isBlank() &&
            !studentToUpdate.getFirstName().equalsIgnoreCase(updateStudentRequest.firstName())){

            studentToUpdate.setFirstName(updateStudentRequest.firstName());
            fieldsChanged = true;
        }

        if (middleName != null) {
            studentToUpdate.setMiddleName(
                    middleName.isBlank() ? null : middleName
            );

            fieldsChanged = true;
        }

        if (updateStudentRequest.lastName() != null &&
                !updateStudentRequest.lastName().isBlank() &&
                !studentToUpdate.getLastName().equalsIgnoreCase(updateStudentRequest.lastName())){

            studentToUpdate.setLastName(updateStudentRequest.lastName());
            fieldsChanged = true;
        }

        if (updateStudentRequest.guardian() != null &&
            !updateStudentRequest.guardian().isBlank() &&
            !studentToUpdate.getGuardian().equalsIgnoreCase(updateStudentRequest.guardian())){

            studentToUpdate.setGuardian(updateStudentRequest.guardian());
            fieldsChanged = true;
        }

        if (updateStudentRequest.guardianPhoneNumber() != null &&
            !updateStudentRequest.guardianPhoneNumber().isBlank() &&
            !studentToUpdate.getGuardianPhoneNumber().equalsIgnoreCase(updateStudentRequest.guardianPhoneNumber())){

            studentToUpdate.setGuardianPhoneNumber(updateStudentRequest.guardianPhoneNumber());
            fieldsChanged = true;
        }

        if (updateStudentRequest.rfid() != null &&
            !updateStudentRequest.rfid().isBlank() &&
            !studentToUpdate.getRfid().equalsIgnoreCase(updateStudentRequest.rfid())){

            if (studentRepository.existsByRfid(updateStudentRequest.rfid())){
                throw new RFIDAlreadyExists();
            }

            studentToUpdate.setRfid(updateStudentRequest.rfid());
            fieldsChanged = true;
        }

        if (updateStudentRequest.lrn() != null &&
            !updateStudentRequest.lrn().isBlank() &&
            !studentToUpdate.getLrn().equalsIgnoreCase(updateStudentRequest.rfid())){

            if (studentRepository.existsByLrn(updateStudentRequest.lrn())){
                throw new StudentAlreadyExists(updateStudentRequest.lrn());
            }

            studentToUpdate.setLrn(updateStudentRequest.lrn());
            fieldsChanged = true;
        }

        if (updateStudentRequest.birthDate() != null &&
            !studentToUpdate.getBirthDate().equals(updateStudentRequest.birthDate())){

            studentToUpdate.setBirthDate(updateStudentRequest.birthDate());
            fieldsChanged = true;
        }

        if (!fieldsChanged){
            throw new NoChangesDetected();
        }

        return studentMapper.toStudentEditResponseDTO(studentToUpdate);
    }

    //DROP STUDENT
    @Transactional
    public StudentEditResponse dropStudent(Long studentId, DropStudentRequest dropStudentRequest){
        Student studentToDrop = getByStudentId(studentId);

        if (studentToDrop.getStudentStatus().equals(StudentStatus.dropped)){
            throw new StudentAlreadyDropped();
        }

        //UPDATE STUDENT ENTITY
        studentToDrop.setStudentStatus(StudentStatus.dropped);

        //UPDATE STUDENT SECTION ASSIGNMENT ENTITY
        StudentSectionAssignment assignmentToUpdate = getByAssignmentStudentId(studentId);
        assignmentToUpdate.setLeftAt(LocalDate.now());
        assignmentToUpdate.setExitType(ExitType.dropped);

        if (dropStudentRequest.remarks() != null &&
            !dropStudentRequest.remarks().isBlank()){
            assignmentToUpdate.setRemarks(dropStudentRequest.remarks());
        }

        return studentMapper.toStudentEditResponseDTO(studentToDrop);
    }

}

package com.edutrack.student.service;

import com.edutrack.schoolyear.enums.SchoolYearStatus;
import com.edutrack.section.entity.Section;
import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.enums.SectionStatus;
import com.edutrack.section.exception.SectionNotFound;
import com.edutrack.section.repository.SectionRepository;
import com.edutrack.section.service.SectionService;
import com.edutrack.shared.exception.NoChangesDetected;
import com.edutrack.shared.util.NameUtil;
import com.edutrack.student.dto.request.*;
import com.edutrack.student.dto.response.StudentEditResponse;
import com.edutrack.student.dto.response.StudentResponse;
import com.edutrack.student.entity.Student;
import com.edutrack.student.enums.StudentStatus;
import com.edutrack.student.exception.*;
import com.edutrack.student.mapper.StudentMapper;
import com.edutrack.student.repository.StudentRepository;
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
import java.time.Period;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class StudentService {
    private final StudentRepository studentRepository;
    private final StudentMapper studentMapper;
    private final SectionRepository sectionRepository;
    private final StudentSectionAssignmentRepository studentSectionAssignmentRepository;
    private final SectionService sectionService;
    LocalDate now = LocalDate.now();

    private Section getBySectionId(int sectionId){
        return sectionRepository.findById(sectionId).orElseThrow(() -> new SectionNotFound(sectionId));
    }

    private Student getByStudentId(Long studentId){
        return studentRepository.findById(studentId).orElseThrow(() -> new StudentNotFound(studentId));
    }

    private StudentSectionAssignment getByAssignmentStudentId(Long studentId){
        return studentSectionAssignmentRepository.findByStudent_StudentIdAndLeftAtIsNull(studentId).orElseThrow(() -> new SectionAssignmentNotFound(studentId));
    }

    private StudentSectionAssignment studentSection(Long studentId){
        return studentSectionAssignmentRepository
                .findByStudent_StudentIdAndLeftAtIsNull(studentId)
                .orElseThrow(() -> new SectionAssignmentNotFound(studentId));
    }


    private boolean hasText(String field){
        return field != null && !field.isBlank();
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

       int age = Period.between(
               studentRequest.birthDate(),
               now
       ).getYears();

        if (studentRepository.existsByLrn(studentRequest.lrn())){
            throw new StudentAlreadyExists(studentRequest.lrn());
        }

        if (studentRepository.existsByRfid(studentRequest.rfid())){
            throw new RFIDAlreadyExists();
        }

        if (age < 9){
            throw new StudentUnderAge();
        }

        if (sectionToBeAssigned.getSectionStatus() == SectionStatus.archived){
            throw new InactiveSectionNotAllowed();
        }

        if (sectionToBeAssigned.getSchoolYear().getSchoolYearStatus() != SchoolYearStatus.active){
            throw new InactiveSectionNotAllowed();
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
                                             String studentName,
                                             Pageable pageable){

        Specification<StudentSectionAssignment> filters = Specification
                .where(StudentSectionAssignmentSpecification.hasGradeLevel(gradeLevel))
                .and(StudentSectionAssignmentSpecification.hasSection(sectionName))
                .and(StudentSectionAssignmentSpecification.hasStudentStatus(studentStatus))
                .and(StudentSectionAssignmentSpecification.isCurrent())
                .and(StudentSectionAssignmentSpecification.hasStudentName(studentName));

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
        StudentSectionAssignment sectionOfStudent = studentSection(studentId);
        boolean fieldsChanged = false;

        if (updateStudentRequest.firstName() != null &&
                !updateStudentRequest.firstName().isBlank() &&
                !studentToUpdate.getFirstName().equalsIgnoreCase(updateStudentRequest.firstName())){
            studentToUpdate.setFirstName(updateStudentRequest.firstName());
            fieldsChanged = true;
        }

        if (updateStudentRequest.middleName() != null) {
            String normalizedMiddleName = updateStudentRequest.middleName().isBlank()
                    ? null : updateStudentRequest.middleName();
            if (!Objects.equals(studentToUpdate.getMiddleName(), normalizedMiddleName)) {
                studentToUpdate.setMiddleName(normalizedMiddleName);
                fieldsChanged = true;
            }
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
                !studentToUpdate.getLrn().equalsIgnoreCase(updateStudentRequest.lrn())){ // fixed
            if (studentRepository.existsByLrn(updateStudentRequest.lrn())){
                throw new StudentAlreadyExists(updateStudentRequest.lrn());
            }
            studentToUpdate.setLrn(updateStudentRequest.lrn());
            fieldsChanged = true;
        }

        if (updateStudentRequest.birthDate() != null &&
                !studentToUpdate.getBirthDate().equals(updateStudentRequest.birthDate())){
            int age = Period.between(updateStudentRequest.birthDate(), now).getYears();
            if (age < 9){
                throw new StudentUnderAge();
            }
            studentToUpdate.setBirthDate(updateStudentRequest.birthDate());
            fieldsChanged = true;
        }

        if (updateStudentRequest.admissionType() != null &&
                studentToUpdate.getAdmissionType() != updateStudentRequest.admissionType()){
            studentToUpdate.setAdmissionType(updateStudentRequest.admissionType());
            fieldsChanged = true;
        }

        if (updateStudentRequest.sectionId() != null){
            Section sectionRequest = getBySectionId(updateStudentRequest.sectionId());

            StudentSectionAssignment assignment =
                    studentSectionAssignmentRepository
                            .findByStudent_StudentIdAndLeftAtIsNull(studentId)
                            .orElseThrow(() -> new SectionAssignmentNotFound(studentId));

            if (sectionRequest.getSectionStatus() == SectionStatus.archived){
                throw new InactiveSectionNotAllowed();
            }

            if (sectionRequest.getSchoolYear().getSchoolYearStatus() != SchoolYearStatus.active){
                throw new InactiveSectionNotAllowed();
            }

            if (assignment.getSection().getSectionId() != updateStudentRequest.sectionId()){
                Section section = sectionRepository
                        .findById(updateStudentRequest.sectionId())
                        .orElseThrow(() -> new SectionNotFound(updateStudentRequest.sectionId()));

                assignment.setSection(section);
                assignment.setUpdatedAt(now);

                fieldsChanged = true;
            }
        }

        if (!fieldsChanged){
            throw new NoChangesDetected();
        }

        return studentMapper.toStudentEditResponseDTO(studentToUpdate, sectionOfStudent);
    }

    //BULK PROMOTION
    @Transactional
    public List<StudentResponse> promoteStudents(BulkPromotionRequest promotionRequest){
        Section promotedStudentSection = getBySectionId(promotionRequest.targetSectionId());
        List<Student> studentsToUpdate = promotionRequest.studentIds().stream().map(this::getByStudentId).toList();

        if (promotedStudentSection.getSectionStatus() == SectionStatus.archived){
            throw new InactiveSectionNotAllowed();
        }

        if (promotedStudentSection.getSchoolYear().getSchoolYearStatus() != SchoolYearStatus.active){
            throw new InactiveSectionNotAllowed();
        }

        List<StudentResponse> responses = new ArrayList<>();

        studentsToUpdate.forEach(student -> {
            StudentSectionAssignment currentAssignment =
                    studentSectionAssignmentRepository.findByStudentAndLeftAtIsNull(student)
                            .orElseThrow(() -> new StudentNotFound(student.getStudentId()));

            currentAssignment.setLeftAt(now);
            currentAssignment.setUpdatedAt(now);
            currentAssignment.setExitType(ExitType.promoted);

            StudentSectionAssignment newAssignment = new StudentSectionAssignment();
            newAssignment.setStudent(student);
            newAssignment.setSection(promotedStudentSection);
            newAssignment.setAssignedAt(now);

            studentSectionAssignmentRepository.save(newAssignment);

            StudentResponse response =
                    studentMapper.toStudentResponseDTO(
                            student,
                            promotedStudentSection
                    );

            responses.add(response);
        });

        return responses;
    }

    //DROP STUDENT
    @Transactional
    public StudentEditResponse dropStudent(Long studentId, UpdateStudentStatusRequest updateStudentStatusRequest){
        Student studentToDrop = getByStudentId(studentId);
        StudentSectionAssignment sectionOfStudent = studentSection(studentId);

        if (studentToDrop.getStudentStatus().equals(StudentStatus.dropped)){
            throw new StudentAlreadyDropped();
        }

        //UPDATE STUDENT ENTITY
        studentToDrop.setStudentStatus(StudentStatus.dropped);

        //UPDATE STUDENT SECTION ASSIGNMENT ENTITY
        StudentSectionAssignment assignmentToUpdate = getByAssignmentStudentId(studentId);
        assignmentToUpdate.setLeftAt(updateStudentStatusRequest.leftAt());
        assignmentToUpdate.setUpdatedAt(now);
        assignmentToUpdate.setExitType(ExitType.dropped);

        if (updateStudentStatusRequest.remarks() != null &&
            !updateStudentStatusRequest.remarks().isBlank()){
            assignmentToUpdate.setRemarks(updateStudentStatusRequest.remarks());
        }

        return studentMapper.toStudentEditResponseDTO(studentToDrop, sectionOfStudent);
    }

    //TRANSFER OUT STUDENT
    @Transactional
    public StudentEditResponse transferOutStudent(Long studentId, UpdateStudentStatusRequest updateStudentStatusRequest){
        Student studentToTransfer = getByStudentId(studentId);
        StudentSectionAssignment sectionOfStudent = studentSection(studentId);

        if (studentToTransfer.getStudentStatus().equals(StudentStatus.transferred_out)){
            throw new StudentAlreadyTransferredOut();
        }

        //UPDATE STUDENT ENTITY
        studentToTransfer.setStudentStatus(StudentStatus.transferred_out);

        //UPDATE STUDENT SECTION ASSIGNMENT ENTITY
        StudentSectionAssignment assignmentToUpdate = getByAssignmentStudentId(studentId);
        assignmentToUpdate.setLeftAt(updateStudentStatusRequest.leftAt());
        assignmentToUpdate.setUpdatedAt(now);
        assignmentToUpdate.setExitType(ExitType.transferred_out);

        if (updateStudentStatusRequest.remarks() != null &&
                !updateStudentStatusRequest.remarks().isBlank()){
            assignmentToUpdate.setRemarks(updateStudentStatusRequest.remarks());
        }

        return studentMapper.toStudentEditResponseDTO(studentToTransfer, sectionOfStudent);
    }

    //GRADUATED
    @Transactional
    public StudentEditResponse graduateStudent(Long studentId, UpdateStudentStatusRequest updateStudentStatusRequest){
        Student studentToGraduate = getByStudentId(studentId);
        StudentSectionAssignment sectionOfStudent = studentSection(studentId);

        if (studentToGraduate.getStudentStatus() == StudentStatus.graduated){
            throw new StudentAlreadyGraduated();
        }

        //UPDATE STUDENT ENTITY
        studentToGraduate.setStudentStatus(StudentStatus.graduated);

        //UPDATE STUDENT SECTION ASSIGNMENT
        StudentSectionAssignment assignmentToUpdate = getByAssignmentStudentId(studentId);
        assignmentToUpdate.setExitType(ExitType.graduated);
        assignmentToUpdate.setLeftAt(updateStudentStatusRequest.leftAt());
        assignmentToUpdate.setUpdatedAt(now);

        if (updateStudentStatusRequest.remarks() != null &&
                !updateStudentStatusRequest.remarks().isBlank()){
            assignmentToUpdate.setRemarks(updateStudentStatusRequest.remarks());
        }

        return studentMapper.toStudentEditResponseDTO(studentToGraduate, sectionOfStudent);
    }

    //SECTION TRANSFER
    @Transactional
    public StudentEditResponse transferStudent(Long studentId, TransferSectionRequest transferSectionRequest){
        Section selectedSection = getBySectionId(transferSectionRequest.sectionId());
        StudentSectionAssignment sectionAssignmentOfStudent = studentSection(studentId);
        Student studentToTransfer = sectionAssignmentOfStudent.getStudent();
        String newSectionName = selectedSection.getSectionName();

        if (sectionAssignmentOfStudent.getSection().getSectionId() == transferSectionRequest.sectionId()){
            throw new SameSection(NameUtil.buildFullName(
                    studentToTransfer.getFirstName(),
                    studentToTransfer.getMiddleName(),
                    studentToTransfer.getLastName()),
                    newSectionName);
        }

        if (selectedSection.getSectionStatus() != SectionStatus.active){
            throw new InactiveSectionNotAllowed();
        }

        if (selectedSection.getSchoolYear().getSchoolYearStatus() != SchoolYearStatus.active){
            throw new InactiveSectionNotAllowed();
        }

        //UPDATE CURRENT SECTION ASSIGNMENT
        sectionAssignmentOfStudent.setExitType(ExitType.section_transfer);
        sectionAssignmentOfStudent.setLeftAt(now);
        sectionAssignmentOfStudent.setUpdatedAt(now);

        //CREATE NEW SECTION ASSIGNMENT
        StudentSectionAssignment newStudentSectionAssignment = new StudentSectionAssignment();
        newStudentSectionAssignment.setStudent(studentToTransfer);
        newStudentSectionAssignment.setSection(selectedSection);
        newStudentSectionAssignment.setAssignedAt(now);
        newStudentSectionAssignment.setCreatedAt(now);
        studentSectionAssignmentRepository.save(newStudentSectionAssignment);

        return studentMapper.toStudentEditResponseDTO(
                studentToTransfer,
                newStudentSectionAssignment);
    }



}

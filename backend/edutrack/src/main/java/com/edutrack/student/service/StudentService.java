
package com.edutrack.student.service;

import com.edutrack.activitylog.service.ActivityLogService;
import com.edutrack.schoolyear.enums.SchoolYearStatus;
import com.edutrack.section.entity.Section;
import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.enums.SectionStatus;
import com.edutrack.section.exception.SectionNotFound;
import com.edutrack.section.repository.SectionRepository;
import com.edutrack.section.service.SectionService;
import com.edutrack.security.CustomUserDetails;
import com.edutrack.shared.exception.NoChangesDetected;
import com.edutrack.shared.util.NameUtil;
import com.edutrack.student.dto.request.*;
import com.edutrack.student.dto.response.StudentEditResponse;
import com.edutrack.student.dto.response.StudentResponse;
import com.edutrack.student.dto.response.StudentSectionAssignmentHistoryResponse;
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
import com.edutrack.user.enums.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class StudentService {
    private final StudentRepository studentRepository;
    private final StudentMapper studentMapper;
    private final SectionRepository sectionRepository;
    private final StudentSectionAssignmentRepository studentSectionAssignmentRepository;
    private final SectionService sectionService;
    private final ActivityLogService activityLogService;

    private boolean hasText(String field){
        return field != null && !field.isBlank();
    }
    public StudentService(StudentRepository studentRepository,
                          StudentMapper studentMapper,
                          SectionRepository sectionRepository,
                          SectionService sectionService,
                          StudentSectionAssignmentRepository studentSectionAssignmentRepository,
                          ActivityLogService activityLogService) {
        this.studentRepository = studentRepository;
        this.studentMapper = studentMapper;
        this.sectionRepository = sectionRepository;
        this.sectionService = sectionService;
        this.studentSectionAssignmentRepository = studentSectionAssignmentRepository;
        this.activityLogService = activityLogService;
    }

    private record EnrollmentResult(Student student, Section section, boolean reEnrolled) {}

    private EnrollmentResult enrollStudentCore(CreateStudentRequest studentRequest){
        Section sectionToBeAssigned = getBySectionId(studentRequest.sectionId());

        int age = Period.between(studentRequest.birthDate(), now).getYears();
        if (age < 9){
            throw new StudentUnderAge();
        }

        if (sectionToBeAssigned.getSectionStatus() == SectionStatus.archived){
            throw new InactiveSectionNotAllowed();
        }

        if (sectionToBeAssigned.getSchoolYear().getSchoolYearStatus() != SchoolYearStatus.active){
            throw new InactiveSectionNotAllowed();
        }

        if (studentRepository.existsByRfidAndStudentStatus(studentRequest.rfid(), StudentStatus.enrolled)){
            throw new RFIDAlreadyExists();
        }

        Optional<Student> existingStudent = studentRepository.findByLrn(studentRequest.lrn());
        boolean reEnrolled = existingStudent.isPresent();
        Student savedStudent;

        if (existingStudent.isPresent()){
            Student student = existingStudent.get();

            if (student.getStudentStatus() == StudentStatus.enrolled){
                throw new StudentAlreadyExists(studentRequest.lrn());
            }

            student.setStudentStatus(StudentStatus.enrolled);
            student.setRfid(studentRequest.rfid());
            savedStudent = studentRepository.save(student);
        } else {
            Student requestToEntity = studentMapper.toEntity(studentRequest);
            savedStudent = studentRepository.save(requestToEntity);
        }

        StudentSectionAssignment assignmentToCreate = new StudentSectionAssignment();
        assignmentToCreate.setStudent(savedStudent);
        assignmentToCreate.setSection(sectionToBeAssigned);
        studentSectionAssignmentRepository.save(assignmentToCreate);

        return new EnrollmentResult(savedStudent, sectionToBeAssigned, reEnrolled);
    }

    private static final DateTimeFormatter DATE_FORMATTER =                                                                                                                                         DateTimeFormatter.ofPattern("MMM d, yyyy");

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

    //ENROLL STUDENT
    @Transactional
    public StudentResponse enrollStudent(CreateStudentRequest studentRequest){
        EnrollmentResult result = enrollStudentCore(studentRequest);

        activityLogService.createLogRecord(
                result.reEnrolled() ? "STUDENT RE-ENROLLED" : "STUDENT ENROLLED",
                (result.reEnrolled() ? "re-enrolled " : "enrolled student ")
                        + NameUtil.buildFullName(result.student().getFirstName(), result.student().getMiddleName(), result.student().getLastName())
                        + " to section " + result.section().getSectionName()
        );

        return studentMapper.toStudentResponseDTO(result.student(), result.section());
    }

    //BULK ENROLLMENT
    @Transactional
    public List<StudentResponse> bulkEnrollStudents(BulkEnrollStudentRequest bulkEnrollStudentRequest){
        List<StudentResponse> responses = new ArrayList<>();
        List<String> enrolledStudents = new ArrayList<>();

        for (CreateStudentRequest studentRequest : bulkEnrollStudentRequest.students()){
            EnrollmentResult result = enrollStudentCore(studentRequest);

            enrolledStudents.add(
                    NameUtil.buildFullName(result.student().getFirstName(), result.student().getMiddleName(), result.student().getLastName())
                            + " (" + result.section().getSectionName() + ")"
            );

            responses.add(studentMapper.toStudentResponseDTO(result.student(), result.section()));
        }

        activityLogService.createLogRecord(
                "STUDENTS BULK ENROLLED",
                "enrolled " + responses.size() + " student(s): " + String.join(", ", enrolledStudents)
        );

        return responses;
    }

    //GET STUDENT HISTORY
    @PreAuthorize("hasRole('ADMIN') or (hasRole('TEACHER') and @studentAccessService.isAdviserOfStudent(#studentId))")
    public List<StudentSectionAssignmentHistoryResponse> getStudentHistory(Long studentId){
        getByStudentId(studentId); // throws StudentNotFound if it doesn't exist

        return studentSectionAssignmentRepository
                .findByStudent_StudentIdOrderByAssignmentIdDesc(studentId)
                .stream()
                .map(a -> new StudentSectionAssignmentHistoryResponse(
                        a.getSection().getSectionName(),
                        a.getSection().getGradeLevel(),
                        a.getAssignedAt(),
                        a.getLeftAt(),
                        a.getExitType(),
                        a.getRemarks()
                ))
                .toList();
    }

    //READ
    public Page<StudentResponse> getStudents(GradeLevel gradeLevel, String sectionName, StudentStatus studentStatus,
                                             String search, Long schoolYearId, Long adviserId,
                                             Pageable pageable, CustomUserDetails principal){

        Specification<StudentSectionAssignment> filters = Specification
                .where(StudentSectionAssignmentSpecification.isLatestAssignment())
                .and(StudentSectionAssignmentSpecification.hasGradeLevel(gradeLevel))
                .and(StudentSectionAssignmentSpecification.hasSection(sectionName))
                .and(StudentSectionAssignmentSpecification.hasStudentStatus(studentStatus))
                .and(StudentSectionAssignmentSpecification.hasSchoolYear(schoolYearId))
                .and(StudentSectionAssignmentSpecification.matchesSearch(search));

        filters = principal.getUser().getUserRole() == UserRole.teacher
                ? filters.and(StudentSectionAssignmentSpecification.hasAdviserId(principal.getUser().getUserId()))
                : filters.and(StudentSectionAssignmentSpecification.hasAdviserId(adviserId));

        return studentSectionAssignmentRepository
                .findAll(filters, pageable)
                .map(assignment -> studentMapper.toStudentResponseDTO(assignment.getStudent(), assignment.getSection()));
    }

    //UPDATE
    @PreAuthorize("hasRole('ADMIN') or (hasRole('TEACHER') and @studentAccessService.isAdviserOfStudent(#studentId))")
    @Transactional
    public StudentEditResponse updateStudent(Long studentId, UpdateStudentRequest updateStudentRequest){
        Student studentToUpdate = getByStudentId(studentId);
        StudentSectionAssignment sectionOfStudent = studentSection(studentId);
        List<String> changes = new ArrayList<>();

        if (updateStudentRequest.firstName() != null &&
                !updateStudentRequest.firstName().isBlank() &&
                !studentToUpdate.getFirstName().equalsIgnoreCase(updateStudentRequest.firstName())){
            changes.add("first name: from " + studentToUpdate.getFirstName() + " to " + updateStudentRequest.firstName());
            studentToUpdate.setFirstName(updateStudentRequest.firstName());
        }

        if (updateStudentRequest.middleName() != null) {
            String normalizedMiddleName = updateStudentRequest.middleName().isBlank()
                    ? null : updateStudentRequest.middleName();
            if (!Objects.equals(studentToUpdate.getMiddleName(), normalizedMiddleName)) {
                String oldMiddleName = studentToUpdate.getMiddleName() == null ? "none" : studentToUpdate.getMiddleName();
                String newMiddleName = normalizedMiddleName == null ? "none" : normalizedMiddleName;
                changes.add("middle name: from " + oldMiddleName + " to " + newMiddleName);
                studentToUpdate.setMiddleName(normalizedMiddleName);
            }
        }

        if (updateStudentRequest.lastName() != null &&
                !updateStudentRequest.lastName().isBlank() &&
                !studentToUpdate.getLastName().equalsIgnoreCase(updateStudentRequest.lastName())){
            changes.add("last name: from " + studentToUpdate.getLastName() + " to " + updateStudentRequest.lastName());
            studentToUpdate.setLastName(updateStudentRequest.lastName());
        }

        if (updateStudentRequest.sex() != null &&
                studentToUpdate.getSex() != updateStudentRequest.sex()){
            changes.add("sex: from " + studentToUpdate.getSex() + " to " + updateStudentRequest.sex());
            studentToUpdate.setSex(updateStudentRequest.sex());
        }

        if (updateStudentRequest.guardian() != null &&
                !updateStudentRequest.guardian().isBlank() &&
                !studentToUpdate.getGuardian().equalsIgnoreCase(updateStudentRequest.guardian())){
            changes.add("guardian: from " + studentToUpdate.getGuardian() + " to " + updateStudentRequest.guardian());
            studentToUpdate.setGuardian(updateStudentRequest.guardian());
        }

        if (updateStudentRequest.guardianPhoneNumber() != null &&
                !updateStudentRequest.guardianPhoneNumber().isBlank() &&
                !studentToUpdate.getGuardianPhoneNumber().equalsIgnoreCase(updateStudentRequest.guardianPhoneNumber())){
            changes.add("guardian phone number: from " + studentToUpdate.getGuardianPhoneNumber() + " to " + updateStudentRequest.guardianPhoneNumber());
            studentToUpdate.setGuardianPhoneNumber(updateStudentRequest.guardianPhoneNumber());
        }

        if (updateStudentRequest.rfid() != null &&
                !updateStudentRequest.rfid().isBlank() &&
                !studentToUpdate.getRfid().equalsIgnoreCase(updateStudentRequest.rfid())){
            if (studentRepository.existsByRfid(updateStudentRequest.rfid())){
                throw new RFIDAlreadyExists();
            }
            changes.add("RFID: from " + studentToUpdate.getRfid() + " to " + updateStudentRequest.rfid());
            studentToUpdate.setRfid(updateStudentRequest.rfid());
        }

        if (updateStudentRequest.lrn() != null &&
                !updateStudentRequest.lrn().isBlank() &&
                !studentToUpdate.getLrn().equalsIgnoreCase(updateStudentRequest.lrn())){
            if (studentRepository.existsByLrn(updateStudentRequest.lrn())){
                throw new StudentAlreadyExists(updateStudentRequest.lrn());
            }
            changes.add("LRN: from " + studentToUpdate.getLrn() + " to " + updateStudentRequest.lrn());
            studentToUpdate.setLrn(updateStudentRequest.lrn());
        }

        if (updateStudentRequest.birthDate() != null &&
                !studentToUpdate.getBirthDate().equals(updateStudentRequest.birthDate())){
            int age = Period.between(updateStudentRequest.birthDate(), now).getYears();
            if (age < 9){
                throw new StudentUnderAge();
            }
            changes.add("birth date: from " + studentToUpdate.getBirthDate().format(DATE_FORMATTER)
                    + " to " + updateStudentRequest.birthDate().format(DATE_FORMATTER));
            studentToUpdate.setBirthDate(updateStudentRequest.birthDate());
        }

        if (updateStudentRequest.admissionType() != null &&
                studentToUpdate.getAdmissionType() != updateStudentRequest.admissionType()){
            changes.add("admission type: from " + studentToUpdate.getAdmissionType() + " to " + updateStudentRequest.admissionType());
            studentToUpdate.setAdmissionType(updateStudentRequest.admissionType());
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
                changes.add("section: from " + assignment.getSection().getSectionName() + " to " + sectionRequest.getSectionName());

                assignment.setSection(sectionRequest);
                assignment.setUpdatedAt(now);
            }
        }


        if (changes.isEmpty()){
            throw new NoChangesDetected();
        }

        activityLogService.createLogRecord(
                "STUDENT INFORMATION UPDATED",
                "updated the student information of "
                        + NameUtil.buildFullName(studentToUpdate.getFirstName(), studentToUpdate.getMiddleName(), studentToUpdate.getLastName())
                        + ", " + String.join(", ", changes)
        );

        return studentMapper.toStudentEditResponseDTO(studentToUpdate, sectionOfStudent);
    }

    //BULK PROMOTION
    @PreAuthorize("hasRole('ADMIN') or (hasRole('TEACHER') and @studentAccessService.isAdviserOfAllStudents(#promotionRequest.studentIds()))")
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
        List<String> promotedStudents = new ArrayList<>();

        studentsToUpdate.forEach(student -> {
            StudentSectionAssignment currentAssignment =
                    studentSectionAssignmentRepository.findByStudentAndLeftAtIsNull(student)
                            .orElseThrow(() -> new StudentNotFound(student.getStudentId()));

            String previousSectionName = currentAssignment.getSection().getSectionName();

            currentAssignment.setLeftAt(now);
            currentAssignment.setUpdatedAt(now);
            currentAssignment.setExitType(ExitType.promoted);

            StudentSectionAssignment newAssignment = new StudentSectionAssignment();
            newAssignment.setStudent(student);
            newAssignment.setSection(promotedStudentSection);
            newAssignment.setAssignedAt(now);

            studentSectionAssignmentRepository.save(newAssignment);

            promotedStudents.add(
                    NameUtil.buildFullName(student.getFirstName(), student.getMiddleName(), student.getLastName())
                            + " (from " + previousSectionName + ")"
            );

            StudentResponse response =
                    studentMapper.toStudentResponseDTO(
                            student,
                            promotedStudentSection
                    );

            responses.add(response);
        });

        activityLogService.createLogRecord(
                "STUDENT PROMOTED",
                "promoted " + promotedStudents.size() + " student(s) to section "
                        + promotedStudentSection.getSectionName() + ": "
                        + String.join(", ", promotedStudents)
        );

        return responses;
    }

    //DROP STUDENT
    @PreAuthorize("hasRole('ADMIN') or (hasRole('TEACHER') and @studentAccessService.isAdviserOfStudent(#studentId))")
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

        activityLogService.createLogRecord(
                "STUDENT DROPPED",
                "marked " +
                NameUtil.buildFullName(studentToDrop.getFirstName(), studentToDrop.getMiddleName(), studentToDrop.getLastName()) +
                " as dropped"

        );
        return studentMapper.toStudentEditResponseDTO(studentToDrop, sectionOfStudent);
    }

    //TRANSFER OUT STUDENT
    @PreAuthorize("hasRole('ADMIN') or (hasRole('TEACHER') and @studentAccessService.isAdviserOfStudent(#studentId))")
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

        activityLogService.createLogRecord(
                "STUDENT TRANSFERRED OUT",
                "marked " +
                        NameUtil.buildFullName(studentToTransfer.getFirstName(), studentToTransfer.getMiddleName(), studentToTransfer.getLastName()) +
                        " as transferred out"

        );

        return studentMapper.toStudentEditResponseDTO(studentToTransfer, sectionOfStudent);
    }

    //GRADUATED
    @PreAuthorize("hasRole('ADMIN') or (hasRole('TEACHER') and @studentAccessService.isAdviserOfStudent(#studentId))")
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

        activityLogService.createLogRecord(
                "STUDENT GRADUATED",
                "marked " +
                        NameUtil.buildFullName(studentToGraduate.getFirstName(), studentToGraduate.getMiddleName(), studentToGraduate.getLastName()) +
                        " as graduated"

        );

        return studentMapper.toStudentEditResponseDTO(studentToGraduate, sectionOfStudent);
    }

    //SECTION TRANSFER
    @PreAuthorize("hasRole('ADMIN') or (hasRole('TEACHER') and @studentAccessService.isAdviserOfStudent(#studentId))")
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

        activityLogService.createLogRecord(
                "STUDENT SECTION TRANSFER",
                "transferred " +
                        NameUtil.buildFullName(studentToTransfer.getFirstName(), studentToTransfer.getMiddleName(), studentToTransfer.getLastName()) +
                        " from section " + sectionAssignmentOfStudent.getSection().getSectionName() +
                        " to section " + selectedSection.getSectionName()

        );

        return studentMapper.toStudentEditResponseDTO(
                studentToTransfer,
                newStudentSectionAssignment);
    }



}

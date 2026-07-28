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
    private final SectionService sectionService;

    public StudentService(StudentRepository studentRepository, StudentMapper studentMapper, SectionRepository sectionRepository, SectionService sectionService) {
        this.studentRepository = studentRepository;
        this.studentMapper = studentMapper;
        this.sectionRepository = sectionRepository;
        this.sectionService = sectionService;
    }

    //CREATE
    @Transactional
    public StudentResponse createStudent(CreateStudentRequest studentRequest){

        if (studentRepository.existsByLrn(studentRequest.lrn())){
            throw new StudentAlreadyExists(studentRequest.lrn());
        }

        if (studentRepository.existsByRfid(studentRequest.rfid())){
            throw new RFIDAlreadyExists();
        }


        Student requestToEntity = studentMapper.toEntity(studentRequest);
        Student savedStudent = studentRepository.save(requestToEntity);
        return studentMapper.toStudentResponseDTO(savedStudent);
    }


    //READ
    public Page<StudentResponse> getStudents(GradeLevel gradeLevel, String sectionName, StudentStatus studentStatus, Pageable pageable){
        Specification<Student> filters = Specification
                .where(StudentSpecification.hasGradeLevel(gradeLevel))
                .and(StudentSpecification.hasSectionName(sectionName))
                .and(StudentSpecification.hasStatus(studentStatus));
        return studentRepository.findAll(filters, pageable).map(studentMapper::toStudentResponseDTO);
    }

    //UPDATE
    @Transactional
    public StudentResponse updateStudent(Long studentId, UpdateStudentRequest updateStudentRequest){
        Student studentToUpdate = studentRepository.findById(studentId).orElseThrow(() -> new StudentNotFound(studentId));
        boolean fieldChanged = false;

        if (updateStudentRequest.firstName() != null &&
                !updateStudentRequest.firstName().isBlank() &&
                !studentToUpdate.getFirstName().equalsIgnoreCase(updateStudentRequest.firstName())){
            studentToUpdate.setFirstName(updateStudentRequest.firstName());
            fieldChanged = true;
        }


        if (updateStudentRequest.middleName() != null &&
                !studentToUpdate.getMiddleName().equalsIgnoreCase(updateStudentRequest.middleName())){
            if (updateStudentRequest.middleName().isEmpty()){
                studentToUpdate.setMiddleName(null);
            }
            studentToUpdate.setMiddleName(updateStudentRequest.middleName());
            fieldChanged = true;
        }


        if (updateStudentRequest.lastName() != null &&
        !updateStudentRequest.lastName().isBlank() &&
        !studentToUpdate.getLastName().equalsIgnoreCase(updateStudentRequest.lastName())){
            studentToUpdate.setLastName(updateStudentRequest.lastName());
            fieldChanged = true;
        }

        if (updateStudentRequest.lrn() != null &&
        !updateStudentRequest.lrn().isBlank() &&
        !studentToUpdate.getLrn().equalsIgnoreCase(updateStudentRequest.lrn())){
            if (studentRepository.existsByLrn(updateStudentRequest.lrn())){
                throw new StudentAlreadyExists(updateStudentRequest.lrn());
            }
            studentToUpdate.setLrn(updateStudentRequest.lrn());
            fieldChanged = true;
        }

        if (updateStudentRequest.rfid() != null &&
        !updateStudentRequest.rfid().isBlank() &&
        !studentToUpdate.getRfid().equalsIgnoreCase(updateStudentRequest.rfid())){
            if (studentRepository.existsByRfid(updateStudentRequest.rfid())){
                throw new RFIDAlreadyExists();
            }
            studentToUpdate.setRfid(updateStudentRequest.rfid());
            fieldChanged = true;
        }

        if (updateStudentRequest.guardian() != null &&
        !updateStudentRequest.guardian().isBlank() &&
        !studentToUpdate.getGuardian().equalsIgnoreCase(updateStudentRequest.guardian())){
            studentToUpdate.setGuardian(updateStudentRequest.guardian());
            fieldChanged = true;
        }

        if (updateStudentRequest.guardianPhoneNumber() != null &&
        !updateStudentRequest.guardianPhoneNumber().isBlank() &&
        !studentToUpdate.getGuardianPhoneNumber().equalsIgnoreCase(updateStudentRequest.guardianPhoneNumber())){
            studentToUpdate.setGuardianPhoneNumber(updateStudentRequest.guardianPhoneNumber());
            fieldChanged = true;
        }

        if (updateStudentRequest.birthDate() != null &&
            !studentToUpdate.getBirthDate().equals(updateStudentRequest.birthDate())){
            studentToUpdate.setBirthDate(updateStudentRequest.birthDate());
            fieldChanged = true;
        }

        if (!fieldChanged){
            throw new NoChangesDetected();
        }

        return studentMapper.toStudentResponseDTO(studentToUpdate);
    }

}

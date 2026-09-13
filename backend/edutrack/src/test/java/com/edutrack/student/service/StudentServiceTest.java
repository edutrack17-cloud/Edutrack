//package com.edutrack.student.service;
//
//import com.edutrack.activitylog.service.ActivityLogService;
//import com.edutrack.schoolyear.entity.SchoolYear;
//import com.edutrack.schoolyear.enums.SchoolYearStatus;
//import com.edutrack.section.entity.Section;
//import com.edutrack.section.enums.SectionStatus;
//import com.edutrack.section.exception.SectionNotFound;
//import com.edutrack.section.repository.SectionRepository;
//import com.edutrack.section.service.SectionService;
//import com.edutrack.security.CustomUserDetails;
//import com.edutrack.shared.exception.*;
//import com.edutrack.student.dto.request.*;
//import com.edutrack.student.dto.response.StudentEditResponse;
//import com.edutrack.student.dto.response.StudentResponse;
//import com.edutrack.student.entity.Student;
//import com.edutrack.student.enums.AdmissionType;
//import com.edutrack.student.enums.StudentStatus;
//import com.edutrack.student.exception.*;
//import com.edutrack.student.mapper.StudentMapper;
//import com.edutrack.student.repository.StudentRepository;
//import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
//import com.edutrack.studentsectionassignment.enums.ExitType;
//import com.edutrack.studentsectionassignment.repository.StudentSectionAssignmentRepository;
//import com.edutrack.user.entity.User;
//import com.edutrack.user.enums.UserRole;
//import org.junit.jupiter.api.BeforeEach;
//import org.junit.jupiter.api.Nested;
//import org.junit.jupiter.api.Test;
//import org.junit.jupiter.api.extension.ExtendWith;
//import org.mockito.ArgumentCaptor;
//import org.mockito.InjectMocks;
//import org.mockito.Mock;
//import org.mockito.junit.jupiter.MockitoExtension;
//import org.springframework.data.domain.Page;
//import org.springframework.data.domain.PageImpl;
//import org.springframework.data.domain.PageRequest;
//import org.springframework.data.domain.Pageable;
//import org.springframework.data.jpa.domain.Specification;
//
//import java.time.LocalDate;
//import java.util.List;
//import java.util.Optional;
//
//import static org.assertj.core.api.Assertions.assertThat;
//import static org.junit.jupiter.api.Assertions.assertThrows;
//import static org.mockito.ArgumentMatchers.*;
//import static org.mockito.Mockito.*;
//
//@ExtendWith(MockitoExtension.class)
//class StudentServiceTest {
//
//    @Mock private StudentRepository studentRepository;
//    @Mock private StudentMapper studentMapper;
//    @Mock private SectionRepository sectionRepository;
//    @Mock private SectionService sectionService;
//    @Mock private StudentSectionAssignmentRepository studentSectionAssignmentRepository;
//    @Mock private ActivityLogService activityLogService;
//
//    @InjectMocks
//    private StudentService studentService;
//
//    private Student student;
//    private StudentSectionAssignment activeAssignment;
//
//    @BeforeEach
//    void setUp() {
//        student = new Student();
//        student.setStudentId(1L);
//        student.setFirstName("Juan");
//        student.setMiddleName("Santos");
//        student.setLastName("Dela Cruz");
//        student.setLrn("123456789012");
//        student.setRfid("RFID-001");
//        student.setBirthDate(LocalDate.now().minusYears(12));
//        student.setGuardian("Maria Dela Cruz");
//        student.setGuardianPhoneNumber("09171234567");
//        student.setStudentStatus(StudentStatus.enrolled);
//        student.setAdmissionType(AdmissionType.regular);
//
//        // no section set here on purpose - methods that don't touch Section
//        // (drop/transferOut/graduate) never call getSection() on this object,
//        // since the mapper that receives it is mocked.
//        activeAssignment = new StudentSectionAssignment();
//        activeAssignment.setStudent(student);
//    }
//
//    /** A Section mock wired to look "active" end-to-end (status + school year). */
//    private Section activeSection(int sectionId, String name) {
//        SchoolYear schoolYear = mock(SchoolYear.class);
//        lenient().when(schoolYear.getSchoolYearStatus()).thenReturn(SchoolYearStatus.active);
//
//        Section section = mock(Section.class);
//        lenient().when(section.getSectionId()).thenReturn(sectionId);
//        lenient().when(section.getSectionName()).thenReturn(name);
//        lenient().when(section.getSectionStatus()).thenReturn(SectionStatus.active);
//        lenient().when(section.getSchoolYear()).thenReturn(schoolYear);
//        return section;
//    }
//
//    // ================= enrollStudent =================
//    @Nested
//    class EnrollStudent {
//
//        private CreateStudentRequest request(int sectionId, String lrn, String rfid, LocalDate birthDate) {
//            CreateStudentRequest req = mock(CreateStudentRequest.class);
//            lenient().when(req.sectionId()).thenReturn(sectionId);
//            lenient().when(req.lrn()).thenReturn(lrn);
//            lenient().when(req.rfid()).thenReturn(rfid);
//            lenient().when(req.birthDate()).thenReturn(birthDate);
//            return req;
//        }
//
//        @Test
//        void enrollsStudentSuccessfully() {
//            Section section = activeSection(10, "Grade 7 - Rizal");
//            CreateStudentRequest req = request(10, "123456789012", "RFID-001", LocalDate.now().minusYears(12));
//
//            when(sectionRepository.findById(10)).thenReturn(Optional.of(section));
//            when(studentRepository.existsByLrn("123456789012")).thenReturn(false);
//            when(studentRepository.existsByRfid("RFID-001")).thenReturn(false);
//            when(studentMapper.toEntity(req)).thenReturn(student);
//            when(studentRepository.save(student)).thenReturn(student);
//
//            StudentResponse expected = mock(StudentResponse.class);
//            when(studentMapper.toStudentResponseDTO(student, section)).thenReturn(expected);
//
//            StudentResponse actual = studentService.enrollStudent(req);
//
//            assertThat(actual).isEqualTo(expected);
//            ArgumentCaptor<StudentSectionAssignment> captor = ArgumentCaptor.forClass(StudentSectionAssignment.class);
//            verify(studentSectionAssignmentRepository).save(captor.capture());
//            assertThat(captor.getValue().getStudent()).isEqualTo(student);
//            assertThat(captor.getValue().getSection()).isEqualTo(section);
//            verify(activityLogService).createLogRecord(eq("STUDENT ENROLLED"), anyString());
//        }
//
//        @Test
//        void throwsWhenSectionDoesNotExist() {
//            CreateStudentRequest req = request(99, "123456789012", "RFID-001", LocalDate.now().minusYears(12));
//            when(sectionRepository.findById(99)).thenReturn(Optional.empty());
//
//            assertThrows(SectionNotFound.class, () -> studentService.enrollStudent(req));
//            verifyNoInteractions(activityLogService);
//        }
//
//        @Test
//        void throwsWhenLrnAlreadyExists() {
//            Section section = activeSection(10, "Grade 7 - Rizal");
//            CreateStudentRequest req = request(10, "123456789012", "RFID-001", LocalDate.now().minusYears(12));
//            when(sectionRepository.findById(10)).thenReturn(Optional.of(section));
//            when(studentRepository.existsByLrn("123456789012")).thenReturn(true);
//
//            assertThrows(StudentAlreadyExists.class, () -> studentService.enrollStudent(req));
//            verify(studentRepository, never()).save(any());
//        }
//
//        @Test
//        void throwsWhenRfidAlreadyExists() {
//            Section section = activeSection(10, "Grade 7 - Rizal");
//            CreateStudentRequest req = request(10, "123456789012", "RFID-001", LocalDate.now().minusYears(12));
//            when(sectionRepository.findById(10)).thenReturn(Optional.of(section));
//            when(studentRepository.existsByLrn("123456789012")).thenReturn(false);
//            when(studentRepository.existsByRfid("RFID-001")).thenReturn(true);
//
//            assertThrows(RFIDAlreadyExists.class, () -> studentService.enrollStudent(req));
//            verify(studentRepository, never()).save(any());
//        }
//
//        @Test
//        void throwsWhenStudentIsUnderage() {
//            Section section = activeSection(10, "Grade 7 - Rizal");
//            CreateStudentRequest req = request(10, "123456789012", "RFID-001", LocalDate.now().minusYears(5));
//            when(sectionRepository.findById(10)).thenReturn(Optional.of(section));
//            when(studentRepository.existsByLrn("123456789012")).thenReturn(false);
//            when(studentRepository.existsByRfid("RFID-001")).thenReturn(false);
//
//            assertThrows(StudentUnderAge.class, () -> studentService.enrollStudent(req));
//            verify(studentRepository, never()).save(any());
//        }
//
//        @Test
//        void throwsWhenSectionIsArchived() {
//            Section section = mock(Section.class);
//            lenient().when(section.getSectionStatus()).thenReturn(SectionStatus.archived);
//            CreateStudentRequest req = request(10, "123456789012", "RFID-001", LocalDate.now().minusYears(12));
//            when(sectionRepository.findById(10)).thenReturn(Optional.of(section));
//            when(studentRepository.existsByLrn("123456789012")).thenReturn(false);
//            when(studentRepository.existsByRfid("RFID-001")).thenReturn(false);
//
//            assertThrows(InactiveSectionNotAllowed.class, () -> studentService.enrollStudent(req));
//        }
//
//        @Test
//        void throwsWhenSchoolYearIsNotActive() {
//            SchoolYear closedYear = mock(SchoolYear.class);
//            lenient().when(closedYear.getSchoolYearStatus()).thenReturn(SchoolYearStatus.closed);
//            Section section = mock(Section.class);
//            lenient().when(section.getSectionStatus()).thenReturn(SectionStatus.active);
//            lenient().when(section.getSchoolYear()).thenReturn(closedYear);
//            CreateStudentRequest req = request(10, "123456789012", "RFID-001", LocalDate.now().minusYears(12));
//            when(sectionRepository.findById(10)).thenReturn(Optional.of(section));
//            when(studentRepository.existsByLrn("123456789012")).thenReturn(false);
//            when(studentRepository.existsByRfid("RFID-001")).thenReturn(false);
//
//            assertThrows(InactiveSectionNotAllowed.class, () -> studentService.enrollStudent(req));
//        }
//    }
//
//    // ================= getStudents =================
//    @Nested
//    class GetStudents {
//
//        @Test
//        void adminSeesMappedResults() {
//            CustomUserDetails principal = mock(CustomUserDetails.class);
//            User adminUser = mock(User.class);
//            when(principal.getUser()).thenReturn(adminUser);
//            when(adminUser.getUserRole()).thenReturn(UserRole.admin);
//
//            Section section = activeSection(10, "Grade 7 - Rizal");
//            activeAssignment.setSection(section);
//            Pageable pageable = PageRequest.of(0, 10);
//            Page<StudentSectionAssignment> page = new PageImpl<>(List.of(activeAssignment));
//            when(studentSectionAssignmentRepository.findAll(any(Specification.class), eq(pageable)))
//                    .thenReturn(page);
//
//            StudentResponse mapped = mock(StudentResponse.class);
//            when(studentMapper.toStudentResponseDTO(student, section)).thenReturn(mapped);
//
//            Page<StudentResponse> result = studentService.getStudents(null, null, null, null, pageable, principal);
//
//            assertThat(result.getContent()).containsExactly(mapped);
//        }
//
//        @Test
//        void teacherRequestStillMapsResults() {
//            CustomUserDetails principal = mock(CustomUserDetails.class);
//            User teacherUser = mock(User.class);
//            when(principal.getUser()).thenReturn(teacherUser);
//            when(teacherUser.getUserRole()).thenReturn(UserRole.teacher);
//            when(teacherUser.getUserId()).thenReturn(5L);
//
//            Section section = activeSection(10, "Grade 7 - Rizal");
//            activeAssignment.setSection(section);
//            Pageable pageable = PageRequest.of(0, 10);
//            Page<StudentSectionAssignment> page = new PageImpl<>(List.of(activeAssignment));
//            when(studentSectionAssignmentRepository.findAll(any(Specification.class), eq(pageable)))
//                    .thenReturn(page);
//
//            StudentResponse mapped = mock(StudentResponse.class);
//            when(studentMapper.toStudentResponseDTO(student, section)).thenReturn(mapped);
//
//            Page<StudentResponse> result = studentService.getStudents(null, null, null, null, pageable, principal);
//
//            assertThat(result.getContent()).containsExactly(mapped);
//            // This confirms the teacher path runs and maps correctly, but it doesn't prove the
//            // adviser-only filter actually narrows the query - a mocked Specification can't be
//            // "executed". Proving that needs either @DataJpaTest against a real/in-memory DB, or
//            // mockStatic(StudentSectionAssignmentSpecification.class) to verify hasAdviserId(5L)
//            // was invoked. Say the word if you want that added.
//        }
//    }
//
//    // ================= updateStudent =================
//    @Nested
//    class UpdateStudent {
//
//        @Test
//        void updatesChangedFieldsAndLogsThem() {
//            UpdateStudentRequest req = mock(UpdateStudentRequest.class);
//            when(req.firstName()).thenReturn("Gill");
//            when(req.guardianPhoneNumber()).thenReturn("09179998888");
//
//            when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
//            when(studentSectionAssignmentRepository.findByStudent_StudentIdAndLeftAtIsNull(1L))
//                    .thenReturn(Optional.of(activeAssignment));
//
//            StudentEditResponse expected = mock(StudentEditResponse.class);
//            when(studentMapper.toStudentEditResponseDTO(student, activeAssignment)).thenReturn(expected);
//
//            StudentEditResponse actual = studentService.updateStudent(1L, req);
//
//            assertThat(actual).isEqualTo(expected);
//            assertThat(student.getFirstName()).isEqualTo("Gill");
//            assertThat(student.getGuardianPhoneNumber()).isEqualTo("09179998888");
//            verify(activityLogService).createLogRecord(eq("STUDENT INFORMATION UPDATED"), contains("first name"));
//        }
//
//        @Test
//        void throwsNoChangesDetectedWhenRequestMatchesCurrentState() {
//            UpdateStudentRequest req = mock(UpdateStudentRequest.class);
//            // every accessor left unstubbed -> returns null -> no field looks "changed"
//
//            when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
//            when(studentSectionAssignmentRepository.findByStudent_StudentIdAndLeftAtIsNull(1L))
//                    .thenReturn(Optional.of(activeAssignment));
//
//            assertThrows(NoChangesDetected.class, () -> studentService.updateStudent(1L, req));
//            verifyNoInteractions(activityLogService);
//        }
//
//        @Test
//        void throwsWhenNewRfidAlreadyExists() {
//            UpdateStudentRequest req = mock(UpdateStudentRequest.class);
//            when(req.rfid()).thenReturn("RFID-999");
//
//            when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
//            when(studentSectionAssignmentRepository.findByStudent_StudentIdAndLeftAtIsNull(1L))
//                    .thenReturn(Optional.of(activeAssignment));
//            when(studentRepository.existsByRfid("RFID-999")).thenReturn(true);
//
//            assertThrows(RFIDAlreadyExists.class, () -> studentService.updateStudent(1L, req));
//            assertThat(student.getRfid()).isEqualTo("RFID-001");
//        }
//
//        @Test
//        void throwsWhenNewLrnAlreadyExists() {
//            UpdateStudentRequest req = mock(UpdateStudentRequest.class);
//            when(req.lrn()).thenReturn("999999999999");
//
//            when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
//            when(studentSectionAssignmentRepository.findByStudent_StudentIdAndLeftAtIsNull(1L))
//                    .thenReturn(Optional.of(activeAssignment));
//            when(studentRepository.existsByLrn("999999999999")).thenReturn(true);
//
//            assertThrows(StudentAlreadyExists.class, () -> studentService.updateStudent(1L, req));
//            assertThat(student.getLrn()).isEqualTo("123456789012");
//        }
//
//        @Test
//        void throwsWhenNewBirthDateMakesStudentUnderage() {
//            UpdateStudentRequest req = mock(UpdateStudentRequest.class);
//            when(req.birthDate()).thenReturn(LocalDate.now().minusYears(4));
//
//            when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
//            when(studentSectionAssignmentRepository.findByStudent_StudentIdAndLeftAtIsNull(1L))
//                    .thenReturn(Optional.of(activeAssignment));
//
//            assertThrows(StudentUnderAge.class, () -> studentService.updateStudent(1L, req));
//        }
//
//        @Test
//        void movesStudentToNewSectionWhenSectionIdDiffers() {
//            Section currentSection = activeSection(10, "Grade 7 - Rizal");
//            Section newSection = activeSection(20, "Grade 7 - Mabini");
//            activeAssignment.setSection(currentSection);
//
//            UpdateStudentRequest req = mock(UpdateStudentRequest.class);
//            when(req.sectionId()).thenReturn(20);
//
//            when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
//            when(studentSectionAssignmentRepository.findByStudent_StudentIdAndLeftAtIsNull(1L))
//                    .thenReturn(Optional.of(activeAssignment));
//            when(sectionRepository.findById(20)).thenReturn(Optional.of(newSection));
//
//            StudentEditResponse expected = mock(StudentEditResponse.class);
//            when(studentMapper.toStudentEditResponseDTO(student, activeAssignment)).thenReturn(expected);
//
//            StudentEditResponse actual = studentService.updateStudent(1L, req);
//
//            assertThat(actual).isEqualTo(expected);
//            assertThat(activeAssignment.getSection()).isEqualTo(newSection);
//            assertThat(activeAssignment.getUpdatedAt()).isNotNull();
//        }
//
//        @Test
//        void throwsWhenRequestedSectionIsArchived() {
//            Section currentSection = activeSection(10, "Grade 7 - Rizal");
//            activeAssignment.setSection(currentSection);
//
//            Section archivedSection = mock(Section.class);
//            lenient().when(archivedSection.getSectionStatus()).thenReturn(SectionStatus.archived);
//
//            UpdateStudentRequest req = mock(UpdateStudentRequest.class);
//            when(req.sectionId()).thenReturn(30);
//
//            when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
//            when(studentSectionAssignmentRepository.findByStudent_StudentIdAndLeftAtIsNull(1L))
//                    .thenReturn(Optional.of(activeAssignment));
//            when(sectionRepository.findById(30)).thenReturn(Optional.of(archivedSection));
//
//            assertThrows(InactiveSectionNotAllowed.class, () -> studentService.updateStudent(1L, req));
//        }
//    }
//
//    // ================= promoteStudents =================
//    @Nested
//    class PromoteStudents {
//
//        private BulkPromotionRequest request(int targetSectionId, List<Long> studentIds) {
//            BulkPromotionRequest req = mock(BulkPromotionRequest.class);
//            lenient().when(req.targetSectionId()).thenReturn(targetSectionId);
//            lenient().when(req.studentIds()).thenReturn(studentIds);
//            return req;
//        }
//
//        @Test
//        void promotesAllStudentsToTargetSection() {
//            Student secondStudent = new Student();
//            secondStudent.setStudentId(2L);
//            secondStudent.setFirstName("Ana");
//            secondStudent.setLastName("Reyes");
//
//            Section oldSection = activeSection(10, "Grade 7 - Rizal");
//            Section targetSection = activeSection(11, "Grade 8 - Rizal");
//
//            StudentSectionAssignment assignment1 = new StudentSectionAssignment();
//            assignment1.setStudent(student);
//            assignment1.setSection(oldSection);
//            StudentSectionAssignment assignment2 = new StudentSectionAssignment();
//            assignment2.setStudent(secondStudent);
//            assignment2.setSection(oldSection);
//
//            BulkPromotionRequest req = request(11, List.of(1L, 2L));
//
//            when(sectionRepository.findById(11)).thenReturn(Optional.of(targetSection));
//            when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
//            when(studentRepository.findById(2L)).thenReturn(Optional.of(secondStudent));
//            when(studentSectionAssignmentRepository.findByStudentAndLeftAtIsNull(student))
//                    .thenReturn(Optional.of(assignment1));
//            when(studentSectionAssignmentRepository.findByStudentAndLeftAtIsNull(secondStudent))
//                    .thenReturn(Optional.of(assignment2));
//
//            StudentResponse response1 = mock(StudentResponse.class);
//            StudentResponse response2 = mock(StudentResponse.class);
//            when(studentMapper.toStudentResponseDTO(student, targetSection)).thenReturn(response1);
//            when(studentMapper.toStudentResponseDTO(secondStudent, targetSection)).thenReturn(response2);
//
//            List<StudentResponse> results = studentService.promoteStudents(req);
//
//            assertThat(results).containsExactly(response1, response2);
//            assertThat(assignment1.getExitType()).isEqualTo(ExitType.promoted);
//            assertThat(assignment2.getExitType()).isEqualTo(ExitType.promoted);
//            verify(studentSectionAssignmentRepository, times(2)).save(any());
//            verify(activityLogService).createLogRecord(eq("STUDENT PROMOTED"), contains("2 student"));
//        }
//
//        @Test
//        void throwsWhenTargetSectionIsArchived() {
//            Section archivedSection = mock(Section.class);
//            lenient().when(archivedSection.getSectionStatus()).thenReturn(SectionStatus.archived);
//            when(sectionRepository.findById(11)).thenReturn(Optional.of(archivedSection));
//            when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
//
//            BulkPromotionRequest req = request(11, List.of(1L));
//
//            assertThrows(InactiveSectionNotAllowed.class, () -> studentService.promoteStudents(req));
//        }
//
//        @Test
//        void throwsWhenTargetSchoolYearIsNotActive() {
//            SchoolYear closedYear = mock(SchoolYear.class);
//            lenient().when(closedYear.getSchoolYearStatus()).thenReturn(SchoolYearStatus.closed);
//            Section section = mock(Section.class);
//            lenient().when(section.getSectionStatus()).thenReturn(SectionStatus.active);
//            lenient().when(section.getSchoolYear()).thenReturn(closedYear);
//            when(sectionRepository.findById(11)).thenReturn(Optional.of(section));
//            when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
//
//            BulkPromotionRequest req = request(11, List.of(1L));
//
//            assertThrows(InactiveSectionNotAllowed.class, () -> studentService.promoteStudents(req));
//        }
//
//        @Test
//        void throwsWhenStudentHasNoCurrentSectionAssignment() {
//            Section targetSection = activeSection(11, "Grade 8 - Rizal");
//            when(sectionRepository.findById(11)).thenReturn(Optional.of(targetSection));
//            when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
//            when(studentSectionAssignmentRepository.findByStudentAndLeftAtIsNull(student))
//                    .thenReturn(Optional.empty());
//
//            BulkPromotionRequest req = request(11, List.of(1L));
//
//            assertThrows(StudentNotFound.class, () -> studentService.promoteStudents(req));
//        }
//    }
//
//    // ================= dropStudent =================
//    @Nested
//    class DropStudent {
//
//        private UpdateStudentStatusRequest request(LocalDate leftAt, String remarks) {
//            UpdateStudentStatusRequest req = mock(UpdateStudentStatusRequest.class);
//            lenient().when(req.leftAt()).thenReturn(leftAt);
//            lenient().when(req.remarks()).thenReturn(remarks);
//            return req;
//        }
//
//        @Test
//        void marksActiveStudentAsDropped() {
//            UpdateStudentStatusRequest req = request(LocalDate.now(), "Moved to homeschooling");
//
//            when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
//            when(studentSectionAssignmentRepository.findByStudent_StudentIdAndLeftAtIsNull(1L))
//                    .thenReturn(Optional.of(activeAssignment));
//
//            StudentEditResponse expected = mock(StudentEditResponse.class);
//            when(studentMapper.toStudentEditResponseDTO(student, activeAssignment)).thenReturn(expected);
//
//            StudentEditResponse actual = studentService.dropStudent(1L, req);
//
//            assertThat(actual).isEqualTo(expected);
//            assertThat(student.getStudentStatus()).isEqualTo(StudentStatus.dropped);
//            assertThat(activeAssignment.getExitType()).isEqualTo(ExitType.dropped);
//            assertThat(activeAssignment.getRemarks()).isEqualTo("Moved to homeschooling");
//            verify(activityLogService).createLogRecord(eq("STUDENT DROPPED"), anyString());
//        }
//
//        @Test
//        void throwsWhenStudentAlreadyDropped() {
//            student.setStudentStatus(StudentStatus.dropped);
//            UpdateStudentStatusRequest req = request(LocalDate.now(), null);
//
//            when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
//            when(studentSectionAssignmentRepository.findByStudent_StudentIdAndLeftAtIsNull(1L))
//                    .thenReturn(Optional.of(activeAssignment));
//
//            assertThrows(StudentAlreadyDropped.class, () -> studentService.dropStudent(1L, req));
//            verifyNoInteractions(activityLogService);
//        }
//    }
//
//    // ================= transferOutStudent =================
//    @Nested
//    class TransferOutStudent {
//
//        private UpdateStudentStatusRequest request(LocalDate leftAt, String remarks) {
//            UpdateStudentStatusRequest req = mock(UpdateStudentStatusRequest.class);
//            lenient().when(req.leftAt()).thenReturn(leftAt);
//            lenient().when(req.remarks()).thenReturn(remarks);
//            return req;
//        }
//
//        @Test
//        void marksActiveStudentAsTransferredOut() {
//            UpdateStudentStatusRequest req = request(LocalDate.now(), "Moved to another school");
//
//            when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
//            when(studentSectionAssignmentRepository.findByStudent_StudentIdAndLeftAtIsNull(1L))
//                    .thenReturn(Optional.of(activeAssignment));
//
//            StudentEditResponse expected = mock(StudentEditResponse.class);
//            when(studentMapper.toStudentEditResponseDTO(student, activeAssignment)).thenReturn(expected);
//
//            StudentEditResponse actual = studentService.transferOutStudent(1L, req);
//
//            assertThat(actual).isEqualTo(expected);
//            assertThat(student.getStudentStatus()).isEqualTo(StudentStatus.transferred_out);
//            assertThat(activeAssignment.getExitType()).isEqualTo(ExitType.transferred_out);
//            verify(activityLogService).createLogRecord(eq("STUDENT TRANSFERRED OUT"), anyString());
//        }
//
//        @Test
//        void throwsWhenStudentAlreadyTransferredOut() {
//            student.setStudentStatus(StudentStatus.transferred_out);
//            UpdateStudentStatusRequest req = request(LocalDate.now(), null);
//
//            when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
//            when(studentSectionAssignmentRepository.findByStudent_StudentIdAndLeftAtIsNull(1L))
//                    .thenReturn(Optional.of(activeAssignment));
//
//            assertThrows(StudentAlreadyTransferredOut.class, () -> studentService.transferOutStudent(1L, req));
//            verifyNoInteractions(activityLogService);
//        }
//    }
//
//    // ================= graduateStudent =================
//    @Nested
//    class GraduateStudent {
//
//        private UpdateStudentStatusRequest request(LocalDate leftAt, String remarks) {
//            UpdateStudentStatusRequest req = mock(UpdateStudentStatusRequest.class);
//            lenient().when(req.leftAt()).thenReturn(leftAt);
//            lenient().when(req.remarks()).thenReturn(remarks);
//            return req;
//        }
//
//        @Test
//        void marksActiveStudentAsGraduated() {
//            UpdateStudentStatusRequest req = request(LocalDate.now(), null);
//
//            when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
//            when(studentSectionAssignmentRepository.findByStudent_StudentIdAndLeftAtIsNull(1L))
//                    .thenReturn(Optional.of(activeAssignment));
//
//            StudentEditResponse expected = mock(StudentEditResponse.class);
//            when(studentMapper.toStudentEditResponseDTO(student, activeAssignment)).thenReturn(expected);
//
//            StudentEditResponse actual = studentService.graduateStudent(1L, req);
//
//            assertThat(actual).isEqualTo(expected);
//            assertThat(student.getStudentStatus()).isEqualTo(StudentStatus.graduated);
//            assertThat(activeAssignment.getExitType()).isEqualTo(ExitType.graduated);
//            verify(activityLogService).createLogRecord(eq("STUDENT GRADUATED"), anyString());
//        }
//
//        @Test
//        void throwsWhenStudentAlreadyGraduated() {
//            student.setStudentStatus(StudentStatus.graduated);
//            UpdateStudentStatusRequest req = request(LocalDate.now(), null);
//
//            when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
//            when(studentSectionAssignmentRepository.findByStudent_StudentIdAndLeftAtIsNull(1L))
//                    .thenReturn(Optional.of(activeAssignment));
//
//            assertThrows(StudentAlreadyGraduated.class, () -> studentService.graduateStudent(1L, req));
//            verifyNoInteractions(activityLogService);
//        }
//    }
//
//    // ================= transferStudent =================
//    @Nested
//    class TransferStudent {
//
//        private TransferSectionRequest request(int sectionId) {
//            TransferSectionRequest req = mock(TransferSectionRequest.class);
//            lenient().when(req.sectionId()).thenReturn(sectionId);
//            return req;
//        }
//
//        @Test
//        void movesStudentToNewSection() {
//            Section currentSection = activeSection(10, "Grade 7 - Rizal");
//            Section targetSection = activeSection(20, "Grade 7 - Mabini");
//            activeAssignment.setSection(currentSection);
//
//            when(studentSectionAssignmentRepository.findByStudent_StudentIdAndLeftAtIsNull(1L))
//                    .thenReturn(Optional.of(activeAssignment));
//            when(sectionRepository.findById(20)).thenReturn(Optional.of(targetSection));
//
//            StudentEditResponse expected = mock(StudentEditResponse.class);
//            when(studentMapper.toStudentEditResponseDTO(eq(student), any(StudentSectionAssignment.class)))
//                    .thenReturn(expected);
//
//            StudentEditResponse actual = studentService.transferStudent(1L, request(20));
//
//            assertThat(actual).isEqualTo(expected);
//            assertThat(activeAssignment.getExitType()).isEqualTo(ExitType.section_transfer);
//            assertThat(activeAssignment.getLeftAt()).isNotNull();
//
//            ArgumentCaptor<StudentSectionAssignment> captor = ArgumentCaptor.forClass(StudentSectionAssignment.class);
//            verify(studentSectionAssignmentRepository).save(captor.capture());
//            assertThat(captor.getValue().getSection()).isEqualTo(targetSection);
//            assertThat(captor.getValue().getStudent()).isEqualTo(student);
//            verify(activityLogService).createLogRecord(eq("STUDENT SECTION TRANSFER"), anyString());
//        }
//
//        @Test
//        void throwsWhenTargetSectionIsTheCurrentSection() {
//            Section currentSection = activeSection(10, "Grade 7 - Rizal");
//            activeAssignment.setSection(currentSection);
//
//            when(studentSectionAssignmentRepository.findByStudent_StudentIdAndLeftAtIsNull(1L))
//                    .thenReturn(Optional.of(activeAssignment));
//            when(sectionRepository.findById(10)).thenReturn(Optional.of(currentSection));
//
//            assertThrows(SameSection.class, () -> studentService.transferStudent(1L, request(10)));
//        }
//
//        @Test
//        void throwsWhenTargetSectionIsNotActive() {
//            Section currentSection = activeSection(10, "Grade 7 - Rizal");
//            activeAssignment.setSection(currentSection);
//
//            Section archivedSection = mock(Section.class);
//            lenient().when(archivedSection.getSectionId()).thenReturn(30);
//            lenient().when(archivedSection.getSectionStatus()).thenReturn(SectionStatus.archived);
//
//            when(studentSectionAssignmentRepository.findByStudent_StudentIdAndLeftAtIsNull(1L))
//                    .thenReturn(Optional.of(activeAssignment));
//            when(sectionRepository.findById(30)).thenReturn(Optional.of(archivedSection));
//
//            assertThrows(InactiveSectionNotAllowed.class, () -> studentService.transferStudent(1L, request(30)));
//        }
//
//        @Test
//        void throwsWhenTargetSchoolYearIsNotActive() {
//            Section currentSection = activeSection(10, "Grade 7 - Rizal");
//            activeAssignment.setSection(currentSection);
//
//            SchoolYear closedYear = mock(SchoolYear.class);
//            lenient().when(closedYear.getSchoolYearStatus()).thenReturn(SchoolYearStatus.closed);
//            Section targetSection = mock(Section.class);
//            lenient().when(targetSection.getSectionId()).thenReturn(30);
//            lenient().when(targetSection.getSectionStatus()).thenReturn(SectionStatus.active);
//            lenient().when(targetSection.getSchoolYear()).thenReturn(closedYear);
//
//            when(studentSectionAssignmentRepository.findByStudent_StudentIdAndLeftAtIsNull(1L))
//                    .thenReturn(Optional.of(activeAssignment));
//            when(sectionRepository.findById(30)).thenReturn(Optional.of(targetSection));
//
//            assertThrows(InactiveSectionNotAllowed.class, () -> studentService.transferStudent(1L, request(30)));
//        }
//    }
//}
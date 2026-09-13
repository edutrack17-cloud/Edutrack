//package com.edutrack.section.service;
//
///*
// * ASSUMPTIONS: User, SchoolYear, SchoolYearLock, and their enums are confirmed
// * against the real source. The one remaining guess is SectionResponse, whose
// * source I still don't have — it's mocked and asserted by identity rather than
// * by field values, and SchoolYearLockRepository.acquireActivationLock()'s
// * return type (Optional<SchoolYearLock>) is inferred from the entity existing,
// * not confirmed against the repository interface itself.
// */
//
//import com.edutrack.schoolyear.entity.SchoolYear;
//import com.edutrack.schoolyear.entity.SchoolYearLock;
//import com.edutrack.schoolyear.enums.SchoolYearStatus;
//import com.edutrack.schoolyear.exception.*;
//import com.edutrack.schoolyear.repository.SchoolYearLockRepository;
//import com.edutrack.schoolyear.repository.SchoolYearRepository;
//import com.edutrack.section.dto.request.CreateSectionRequest;
//import com.edutrack.section.dto.request.NewSchoolYearRequest;
//import com.edutrack.section.dto.request.UpdateSectionRequest;
//import com.edutrack.section.dto.response.SectionResponse;
//import com.edutrack.section.entity.Section;
//import com.edutrack.section.enums.GradeLevel;
//import com.edutrack.section.enums.SectionStatus;
//import com.edutrack.section.exception.*;
//import com.edutrack.section.mapper.SectionMapper;
//import com.edutrack.section.repository.SectionRepository;
//import com.edutrack.shared.exception.NoChangesDetected;
//import com.edutrack.user.entity.User;
//import com.edutrack.user.enums.AccountStatus;
//import com.edutrack.user.exception.UserNotFoundException;
//import com.edutrack.user.repository.UserRepository;
//
//import org.junit.jupiter.api.BeforeEach;
//import org.junit.jupiter.api.Test;
//import org.junit.jupiter.api.extension.ExtendWith;
//import org.mockito.InjectMocks;
//import org.mockito.Mock;
//import org.mockito.junit.jupiter.MockitoExtension;
//import org.springframework.dao.DataIntegrityViolationException;
//import org.springframework.data.domain.Page;
//import org.springframework.data.domain.PageImpl;
//import org.springframework.data.domain.PageRequest;
//import org.springframework.data.domain.Pageable;
//
//import java.util.List;
//import java.util.Optional;
//
//import static org.junit.jupiter.api.Assertions.*;
//import static org.mockito.ArgumentMatchers.*;
//import static org.mockito.Mockito.*;
//
//@ExtendWith(MockitoExtension.class)
//class SectionServiceTest {
//
//    @Mock private SectionRepository sectionRepository;
//    @Mock private UserRepository userRepository;
//    @Mock private SchoolYearRepository schoolYearRepository;
//    @Mock private SchoolYearLockRepository schoolYearLockRepository;
//    @Mock private SectionMapper sectionMapper;
//
//    @InjectMocks
//    private SectionService sectionService;
//
//    private final GradeLevel GRADE = GradeLevel.values()[0];
//    private Pageable pageable;
//
//    @BeforeEach
//    void setUp() {
//        pageable = PageRequest.of(0, 10);
//    }
//
//    private Section buildSection(Integer id, String name, SchoolYear schoolYear, User adviser,
//                                 GradeLevel gradeLevel, SectionStatus status) {
//        Section section = new Section();
//        section.setSectionId(id);
//        section.setSectionName(name);
//        section.setSchoolYear(schoolYear);
//        section.setUser(adviser);
//        section.setGradeLevel(gradeLevel);
//        section.setSectionStatus(status);
//        return section;
//    }
//
//    // ---------------------------------------------------------------
//    // createSection
//    // ---------------------------------------------------------------
//
//    @Test
//    void createSection_savesAndReturnsResponse_whenValid() {
//        CreateSectionRequest request = new CreateSectionRequest("Section A", 1L, GRADE, 1L);
//
//        User adviser = mock(User.class);
//        SchoolYear schoolYear = mock(SchoolYear.class);
//        Section mappedEntity = new Section();
//        Section savedEntity = buildSection(1, "Section A", schoolYear, adviser, GRADE, SectionStatus.active);
//        SectionResponse expectedResponse = mock(SectionResponse.class);
//
//        when(userRepository.findById(1L)).thenReturn(Optional.of(adviser));
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(schoolYear));
//        when(sectionRepository.existsBySectionNameAndSchoolYear_SchoolYearId("Section A", 1L)).thenReturn(false);
//        when(sectionMapper.toEntity(request)).thenReturn(mappedEntity);
//        when(sectionRepository.save(mappedEntity)).thenReturn(savedEntity);
//        when(sectionMapper.toResponseDTO(savedEntity)).thenReturn(expectedResponse);
//
//        SectionResponse result = sectionService.createSection(request);
//
//        assertEquals(expectedResponse, result);
//        verify(sectionRepository).save(mappedEntity);
//    }
//
//    @Test
//    void createSection_throwsUserNotFoundException_whenAdviserDoesNotExist() {
//        CreateSectionRequest request = new CreateSectionRequest("Section A", 1L, GRADE, 99L);
//        when(userRepository.findById(99L)).thenReturn(Optional.empty());
//
//        assertThrows(UserNotFoundException.class, () -> sectionService.createSection(request));
//
//        verifyNoInteractions(schoolYearRepository);
//        verifyNoInteractions(sectionRepository);
//        verifyNoInteractions(sectionMapper);
//    }
//
//    @Test
//    void createSection_throwsSchoolYearNotFound_whenSchoolYearDoesNotExist() {
//        CreateSectionRequest request = new CreateSectionRequest("Section A", 99L, GRADE, 1L);
//        User adviser = mock(User.class);
//
//        when(userRepository.findById(1L)).thenReturn(Optional.of(adviser));
//        when(schoolYearRepository.findById(99L)).thenReturn(Optional.empty());
//
//        assertThrows(SchoolYearNotFound.class, () -> sectionService.createSection(request));
//
//        verifyNoInteractions(sectionRepository);
//        verifyNoInteractions(sectionMapper);
//    }
//
//    @Test
//    void createSection_throwsSectionAlreadyExists_whenDuplicateFoundByExistsCheck() {
//        CreateSectionRequest request = new CreateSectionRequest("Section A", 1L, GRADE, 1L);
//        User adviser = mock(User.class);
//        SchoolYear schoolYear = mock(SchoolYear.class);
//
//        when(userRepository.findById(1L)).thenReturn(Optional.of(adviser));
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(schoolYear));
//        when(sectionRepository.existsBySectionNameAndSchoolYear_SchoolYearId("Section A", 1L)).thenReturn(true);
//
//        assertThrows(SectionAlreadyExists.class, () -> sectionService.createSection(request));
//
//        verify(sectionMapper, never()).toEntity(any());
//        verify(sectionRepository, never()).save(any());
//    }
//
//    @Test
//    void createSection_throwsSectionAlreadyExists_whenSaveHitsDataIntegrityViolation() {
//        CreateSectionRequest request = new CreateSectionRequest("Section A", 1L, GRADE, 1L);
//        User adviser = mock(User.class);
//        SchoolYear schoolYear = mock(SchoolYear.class);
//        Section mappedEntity = new Section();
//
//        when(userRepository.findById(1L)).thenReturn(Optional.of(adviser));
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(schoolYear));
//        when(sectionRepository.existsBySectionNameAndSchoolYear_SchoolYearId("Section A", 1L)).thenReturn(false);
//        when(sectionMapper.toEntity(request)).thenReturn(mappedEntity);
//        when(sectionRepository.save(mappedEntity)).thenThrow(new DataIntegrityViolationException("duplicate"));
//
//        assertThrows(SectionAlreadyExists.class, () -> sectionService.createSection(request));
//    }
//
//    // ---------------------------------------------------------------
//    // getSection
//    // ---------------------------------------------------------------
//
//    @Test
//    void getSection_returnsMappedPage() {
//        Section section = buildSection(1, "Section A", mock(SchoolYear.class), mock(User.class), GRADE, SectionStatus.active);
//        SectionResponse expectedResponse = mock(SectionResponse.class);
//
//        when(sectionRepository.findAll(any(org.springframework.data.jpa.domain.Specification.class), eq(pageable)))
//                .thenReturn(new PageImpl<>(List.of(section)));
//        when(sectionMapper.toResponseDTO(section)).thenReturn(expectedResponse);
//
//        Page<SectionResponse> result = sectionService.getSection(null, null, null, null, pageable);
//
//        assertEquals(1, result.getTotalElements());
//        assertEquals(expectedResponse, result.getContent().get(0));
//    }
//
//    // ---------------------------------------------------------------
//    // readSectionByAdviser
//    // ---------------------------------------------------------------
//
//    @Test
//    void readSectionByAdviser_returnsMappedList_whenSectionsExist() {
//        Section section = buildSection(1, "Section A", mock(SchoolYear.class), mock(User.class), GRADE, SectionStatus.active);
//        SectionResponse expectedResponse = mock(SectionResponse.class);
//
//        when(sectionRepository.findAllByUser_UserId(1L)).thenReturn(List.of(section));
//        when(sectionMapper.toResponseDTO(section)).thenReturn(expectedResponse);
//
//        List<SectionResponse> result = sectionService.readSectionByAdviser(1L);
//
//        assertEquals(1, result.size());
//        assertEquals(expectedResponse, result.get(0));
//    }
//
//    @Test
//    void readSectionByAdviser_throwsAdvisorySectionNotFound_whenNoneExist() {
//        when(sectionRepository.findAllByUser_UserId(1L)).thenReturn(List.of());
//
//        assertThrows(AdvisorySectionNotFound.class, () -> sectionService.readSectionByAdviser(1L));
//    }
//
//    // ---------------------------------------------------------------
//    // sectionDropDown
//    // ---------------------------------------------------------------
//
//    @Test
//    void sectionDropDown_returnsMappedList_whenActiveSectionsExist() {
//        Section section = buildSection(1, "Section A", mock(SchoolYear.class), mock(User.class), GRADE, SectionStatus.active);
//        SectionResponse expectedResponse = mock(SectionResponse.class);
//
//        when(sectionRepository.findAll(any(org.springframework.data.jpa.domain.Specification.class)))
//                .thenReturn(List.of(section));
//        when(sectionMapper.toResponseDTO(section)).thenReturn(expectedResponse);
//
//        List<SectionResponse> result = sectionService.sectionDropDown(GRADE);
//
//        assertEquals(1, result.size());
//    }
//
//    @Test
//    void sectionDropDown_returnsEmptyList_whenNoneMatch() {
//        when(sectionRepository.findAll(any(org.springframework.data.jpa.domain.Specification.class)))
//                .thenReturn(List.of());
//
//        List<SectionResponse> result = sectionService.sectionDropDown(GRADE);
//
//        assertTrue(result.isEmpty());
//    }
//
//    // ---------------------------------------------------------------
//    // updateSection
//    // ---------------------------------------------------------------
//
//    @Test
//    void updateSection_throwsSectionNotFound_whenSectionDoesNotExist() {
//        when(sectionRepository.findById(1)).thenReturn(Optional.empty());
//        UpdateSectionRequest request = new UpdateSectionRequest("New Name", null, null, null);
//
//        assertThrows(SectionNotFound.class, () -> sectionService.updateSection(1, request));
//    }
//
//    @Test
//    void updateSection_throwsNoChangesDetected_whenRequestIsEmpty() {
//        SchoolYear schoolYear = mock(SchoolYear.class);
//        User adviser = mock(User.class);
//        Section existing = buildSection(1, "Section A", schoolYear, adviser, GRADE, SectionStatus.active);
//        when(sectionRepository.findById(1)).thenReturn(Optional.of(existing));
//
//        UpdateSectionRequest request = new UpdateSectionRequest(null, null, null, null);
//
//        assertThrows(NoChangesDetected.class, () -> sectionService.updateSection(1, request));
//        verify(sectionRepository, never()).saveAndFlush(any());
//    }
//
//    @Test
//    void updateSection_throwsSectionAlreadyExists_whenNewNameConflicts() {
//        SchoolYear schoolYear = mock(SchoolYear.class);
//        when(schoolYear.getSchoolYearId()).thenReturn(1L);
//        User adviser = mock(User.class);
//        Section existing = buildSection(1, "Section A", schoolYear, adviser, GRADE, SectionStatus.active);
//        when(sectionRepository.findById(1)).thenReturn(Optional.of(existing));
//        when(sectionRepository.existsBySectionNameAndSchoolYear_SchoolYearIdAndSectionIdNot("Section B", 1L, 1))
//                .thenReturn(true);
//
//        UpdateSectionRequest request = new UpdateSectionRequest("Section B", null, null, null);
//
//        assertThrows(SectionAlreadyExists.class, () -> sectionService.updateSection(1, request));
//        verify(sectionRepository, never()).saveAndFlush(any());
//    }
//
//    @Test
//    void updateSection_savesNewName_whenNoConflict() {
//        SchoolYear schoolYear = mock(SchoolYear.class);
//        when(schoolYear.getSchoolYearId()).thenReturn(1L);
//        User adviser = mock(User.class);
//        Section existing = buildSection(1, "Section A", schoolYear, adviser, GRADE, SectionStatus.active);
//        SectionResponse expectedResponse = mock(SectionResponse.class);
//
//        when(sectionRepository.findById(1)).thenReturn(Optional.of(existing));
//        when(sectionRepository.existsBySectionNameAndSchoolYear_SchoolYearIdAndSectionIdNot("Section B", 1L, 1))
//                .thenReturn(false);
//        when(sectionRepository.saveAndFlush(existing)).thenReturn(existing);
//        when(sectionMapper.toResponseDTO(existing)).thenReturn(expectedResponse);
//
//        UpdateSectionRequest request = new UpdateSectionRequest("Section B", null, null, null);
//
//        SectionResponse result = sectionService.updateSection(1, request);
//
//        assertEquals(expectedResponse, result);
//        assertEquals("Section B", existing.getSectionName());
//    }
//
//    @Test
//    void updateSection_savesNewSchoolYear_whenChanged() {
//        SchoolYear oldSchoolYear = mock(SchoolYear.class);
//        when(oldSchoolYear.getSchoolYearId()).thenReturn(1L);
//        SchoolYear newSchoolYear = mock(SchoolYear.class);
//        when(newSchoolYear.getSchoolYearId()).thenReturn(2L);
//        User adviser = mock(User.class);
//        Section existing = buildSection(1, "Section A", oldSchoolYear, adviser, GRADE, SectionStatus.active);
//        SectionResponse expectedResponse = mock(SectionResponse.class);
//
//        when(sectionRepository.findById(1)).thenReturn(Optional.of(existing));
//        when(schoolYearRepository.findById(2L)).thenReturn(Optional.of(newSchoolYear));
//        when(sectionRepository.existsBySectionNameAndSchoolYear_SchoolYearIdAndSectionIdNot("Section A", 2L, 1))
//                .thenReturn(false);
//        when(sectionRepository.saveAndFlush(existing)).thenReturn(existing);
//        when(sectionMapper.toResponseDTO(existing)).thenReturn(expectedResponse);
//
//        UpdateSectionRequest request = new UpdateSectionRequest(null, 2L, null, null);
//
//        SectionResponse result = sectionService.updateSection(1, request);
//
//        assertEquals(expectedResponse, result);
//        assertEquals(newSchoolYear, existing.getSchoolYear());
//    }
//
//    @Test
//    void updateSection_savesNewGradeLevel_whenChangedAlone() {
//        SchoolYear schoolYear = mock(SchoolYear.class);
//        User adviser = mock(User.class);
//        GradeLevel newGrade = GradeLevel.values()[GradeLevel.values().length - 1];
//        Section existing = buildSection(1, "Section A", schoolYear, adviser, GRADE, SectionStatus.active);
//        SectionResponse expectedResponse = mock(SectionResponse.class);
//
//        when(sectionRepository.findById(1)).thenReturn(Optional.of(existing));
//        when(sectionRepository.saveAndFlush(existing)).thenReturn(existing);
//        when(sectionMapper.toResponseDTO(existing)).thenReturn(expectedResponse);
//
//        UpdateSectionRequest request = new UpdateSectionRequest(null, null, newGrade, null);
//
//        SectionResponse result = sectionService.updateSection(1, request);
//
//        assertEquals(expectedResponse, result);
//        assertEquals(newGrade, existing.getGradeLevel());
//    }
//
//    @Test
//    void updateSection_throwsTeacherAccountDisabled_whenNewAdviserIsDisabled() {
//        SchoolYear schoolYear = mock(SchoolYear.class);
//        User currentAdviser = mock(User.class);
//        when(currentAdviser.getUserId()).thenReturn(1L);
//        Section existing = buildSection(1, "Section A", schoolYear, currentAdviser, GRADE, SectionStatus.active);
//
//        User newAdviser = mock(User.class);
//        when(newAdviser.getAccountStatus()).thenReturn(AccountStatus.disabled);
//
//        when(sectionRepository.findById(1)).thenReturn(Optional.of(existing));
//        when(userRepository.findById(2L)).thenReturn(Optional.of(newAdviser));
//
//        UpdateSectionRequest request = new UpdateSectionRequest(null, null, null, 2L);
//
//        assertThrows(TeacherAccountDisabled.class, () -> sectionService.updateSection(1, request));
//        verify(sectionRepository, never()).saveAndFlush(any());
//    }
//
//    @Test
//    void updateSection_savesNewAdviser_whenEnabled() {
//        SchoolYear schoolYear = mock(SchoolYear.class);
//        User currentAdviser = mock(User.class);
//        when(currentAdviser.getUserId()).thenReturn(1L);
//        Section existing = buildSection(1, "Section A", schoolYear, currentAdviser, GRADE, SectionStatus.active);
//
//        User newAdviser = mock(User.class);
//        when(newAdviser.getAccountStatus()).thenReturn(AccountStatus.active);
//        SectionResponse expectedResponse = mock(SectionResponse.class);
//
//        when(sectionRepository.findById(1)).thenReturn(Optional.of(existing));
//        when(userRepository.findById(2L)).thenReturn(Optional.of(newAdviser));
//        when(sectionRepository.saveAndFlush(existing)).thenReturn(existing);
//        when(sectionMapper.toResponseDTO(existing)).thenReturn(expectedResponse);
//
//        UpdateSectionRequest request = new UpdateSectionRequest(null, null, null, 2L);
//
//        SectionResponse result = sectionService.updateSection(1, request);
//
//        assertEquals(expectedResponse, result);
//        assertEquals(newAdviser, existing.getUser());
//    }
//
//    @Test
//    void updateSection_throwsSectionAlreadyExists_whenSaveAndFlushHitsDataIntegrityViolation() {
//        SchoolYear schoolYear = mock(SchoolYear.class);
//        User adviser = mock(User.class);
//        GradeLevel newGrade = GradeLevel.values()[GradeLevel.values().length - 1];
//        Section existing = buildSection(1, "Section A", schoolYear, adviser, GRADE, SectionStatus.active);
//
//        when(sectionRepository.findById(1)).thenReturn(Optional.of(existing));
//        when(sectionRepository.saveAndFlush(existing)).thenThrow(new DataIntegrityViolationException("duplicate"));
//
//        UpdateSectionRequest request = new UpdateSectionRequest(null, null, newGrade, null);
//
//        assertThrows(SectionAlreadyExists.class, () -> sectionService.updateSection(1, request));
//    }
//
//    // ---------------------------------------------------------------
//    // archiveSection
//    // ---------------------------------------------------------------
//
//    @Test
//    void archiveSection_throwsSectionNotFound_whenSectionDoesNotExist() {
//        when(sectionRepository.findById(1)).thenReturn(Optional.empty());
//
//        assertThrows(SectionNotFound.class, () -> sectionService.archiveSection(1));
//    }
//
//    @Test
//    void archiveSection_throwsAlreadyArchived_whenAlreadyArchived() {
//        Section existing = buildSection(1, "Section A", mock(SchoolYear.class), mock(User.class), GRADE, SectionStatus.archived);
//        when(sectionRepository.findById(1)).thenReturn(Optional.of(existing));
//
//        assertThrows(AlreadyArchived.class, () -> sectionService.archiveSection(1));
//    }
//
//    @Test
//    void archiveSection_archivesSection_whenActive() {
//        Section existing = buildSection(1, "Section A", mock(SchoolYear.class), mock(User.class), GRADE, SectionStatus.active);
//        SectionResponse expectedResponse = mock(SectionResponse.class);
//
//        when(sectionRepository.findById(1)).thenReturn(Optional.of(existing));
//        when(sectionMapper.toResponseDTO(existing)).thenReturn(expectedResponse);
//
//        SectionResponse result = sectionService.archiveSection(1);
//
//        assertEquals(expectedResponse, result);
//        assertEquals(SectionStatus.archived, existing.getSectionStatus());
//    }
//
//    // ---------------------------------------------------------------
//    // restoreSection
//    // ---------------------------------------------------------------
//
//    @Test
//    void restoreSection_throwsSectionNotFound_whenSectionDoesNotExist() {
//        when(sectionRepository.findById(1)).thenReturn(Optional.empty());
//
//        assertThrows(SectionNotFound.class, () -> sectionService.restoreSection(1));
//    }
//
//    @Test
//    void restoreSection_throwsAlreadyActive_whenAlreadyActive() {
//        Section existing = buildSection(1, "Section A", mock(SchoolYear.class), mock(User.class), GRADE, SectionStatus.active);
//        when(sectionRepository.findById(1)).thenReturn(Optional.of(existing));
//
//        assertThrows(AlreadyActive.class, () -> sectionService.restoreSection(1));
//    }
//
//    @Test
//    void restoreSection_restoresSection_whenArchived() {
//        Section existing = buildSection(1, "Section A", mock(SchoolYear.class), mock(User.class), GRADE, SectionStatus.archived);
//        SectionResponse expectedResponse = mock(SectionResponse.class);
//
//        when(sectionRepository.findById(1)).thenReturn(Optional.of(existing));
//        when(sectionMapper.toResponseDTO(existing)).thenReturn(expectedResponse);
//
//        SectionResponse result = sectionService.restoreSection(1);
//
//        assertEquals(expectedResponse, result);
//        assertEquals(SectionStatus.active, existing.getSectionStatus());
//    }
//
//    // ---------------------------------------------------------------
//    // newSchoolYear
//    // ---------------------------------------------------------------
//
//    @Test
//    void newSchoolYear_throwsActiveSchoolYearLockUnavailable_whenLockNotAcquired() {
//        when(schoolYearLockRepository.acquireActivationLock()).thenReturn(Optional.empty());
//        NewSchoolYearRequest request = new NewSchoolYearRequest(1L, 2L, null);
//
//        assertThrows(ActiveSchoolYearLockUnavailable.class, () -> sectionService.newSchoolYear(request));
//        verifyNoInteractions(schoolYearRepository);
//    }
//
//    @Test
//    void newSchoolYear_throwsActiveSchoolYearNotFound_whenNoActiveSchoolYear() {
//        when(schoolYearLockRepository.acquireActivationLock()).thenReturn(Optional.of(new SchoolYearLock()));
//        when(schoolYearRepository.findBySchoolYearStatus(SchoolYearStatus.active)).thenReturn(Optional.empty());
//        NewSchoolYearRequest request = new NewSchoolYearRequest(1L, 2L, null);
//
//        assertThrows(ActiveSchoolYearNotFound.class, () -> sectionService.newSchoolYear(request));
//    }
//
//    @Test
//    void newSchoolYear_throwsSameSchoolYearNotAllowed_whenSourceEqualsTarget() {
//        SchoolYear current = mock(SchoolYear.class);
//        SchoolYear sameYear = mock(SchoolYear.class);
//        when(sameYear.getSchoolYearId()).thenReturn(5L);
//
//        when(schoolYearLockRepository.acquireActivationLock()).thenReturn(Optional.of(new SchoolYearLock()));
//        when(schoolYearRepository.findBySchoolYearStatus(SchoolYearStatus.active)).thenReturn(Optional.of(current));
//        when(schoolYearRepository.findById(5L)).thenReturn(Optional.of(sameYear));
//
//        NewSchoolYearRequest request = new NewSchoolYearRequest(5L, 5L, null);
//
//        assertThrows(SameSchoolYearNotAllowed.class, () -> sectionService.newSchoolYear(request));
//    }
//
//    @Test
//    void newSchoolYear_throwsSchoolYearNotPlanning_whenTargetNotInPlanningStatus() {
//        SchoolYear current = mock(SchoolYear.class);
//        SchoolYear source = mock(SchoolYear.class);
//        when(source.getSchoolYearId()).thenReturn(1L);
//        SchoolYear target = mock(SchoolYear.class);
//        when(target.getSchoolYearId()).thenReturn(2L);
//        when(target.getSchoolYearStatus()).thenReturn(SchoolYearStatus.closed);
//
//        when(schoolYearLockRepository.acquireActivationLock()).thenReturn(Optional.of(new SchoolYearLock()));
//        when(schoolYearRepository.findBySchoolYearStatus(SchoolYearStatus.active)).thenReturn(Optional.of(current));
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(source));
//        when(schoolYearRepository.findById(2L)).thenReturn(Optional.of(target));
//
//        NewSchoolYearRequest request = new NewSchoolYearRequest(1L, 2L, null);
//
//        assertThrows(SchoolYearNotPlanning.class, () -> sectionService.newSchoolYear(request));
//    }
//
//    @Test
//    void newSchoolYear_throwsSchoolYearAlreadyHasSections_whenTargetHasExistingSections() {
//        SchoolYear current = mock(SchoolYear.class);
//        SchoolYear source = mock(SchoolYear.class);
//        when(source.getSchoolYearId()).thenReturn(1L);
//        SchoolYear target = mock(SchoolYear.class);
//        when(target.getSchoolYearId()).thenReturn(2L);
//        when(target.getSchoolYearStatus()).thenReturn(SchoolYearStatus.planning);
//
//        when(schoolYearLockRepository.acquireActivationLock()).thenReturn(Optional.of(new SchoolYearLock()));
//        when(schoolYearRepository.findBySchoolYearStatus(SchoolYearStatus.active)).thenReturn(Optional.of(current));
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(source));
//        when(schoolYearRepository.findById(2L)).thenReturn(Optional.of(target));
//        when(sectionRepository.countBySchoolYear(target)).thenReturn(3);
//
//        NewSchoolYearRequest request = new NewSchoolYearRequest(1L, 2L, null);
//
//        assertThrows(SchoolYearAlreadyHasSections.class, () -> sectionService.newSchoolYear(request));
//    }
//
//    @Test
//    void newSchoolYear_throwsSchoolYearSectionsNotFound_whenNoSectionsToCloneForAllGrades() {
//        SchoolYear current = mock(SchoolYear.class);
//        SchoolYear source = mock(SchoolYear.class);
//        when(source.getSchoolYearId()).thenReturn(1L);
//        SchoolYear target = mock(SchoolYear.class);
//        when(target.getSchoolYearId()).thenReturn(2L);
//        when(target.getSchoolYearStatus()).thenReturn(SchoolYearStatus.planning);
//
//        when(schoolYearLockRepository.acquireActivationLock()).thenReturn(Optional.of(new SchoolYearLock()));
//        when(schoolYearRepository.findBySchoolYearStatus(SchoolYearStatus.active)).thenReturn(Optional.of(current));
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(source));
//        when(schoolYearRepository.findById(2L)).thenReturn(Optional.of(target));
//        when(sectionRepository.countBySchoolYear(target)).thenReturn(0);
//        when(sectionRepository.findAllBySchoolYear_SchoolYearId(1L)).thenReturn(List.of());
//
//        NewSchoolYearRequest request = new NewSchoolYearRequest(1L, 2L, null);
//
//        assertThrows(SchoolYearSectionsNotFound.class, () -> sectionService.newSchoolYear(request));
//    }
//
//    @Test
//    void newSchoolYear_throwsSchoolYearSectionsNotFound_whenNoSectionsToCloneForSpecificGrade() {
//        SchoolYear current = mock(SchoolYear.class);
//        SchoolYear source = mock(SchoolYear.class);
//        when(source.getSchoolYearId()).thenReturn(1L);
//        SchoolYear target = mock(SchoolYear.class);
//        when(target.getSchoolYearId()).thenReturn(2L);
//        when(target.getSchoolYearStatus()).thenReturn(SchoolYearStatus.planning);
//
//        when(schoolYearLockRepository.acquireActivationLock()).thenReturn(Optional.of(new SchoolYearLock()));
//        when(schoolYearRepository.findBySchoolYearStatus(SchoolYearStatus.active)).thenReturn(Optional.of(current));
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(source));
//        when(schoolYearRepository.findById(2L)).thenReturn(Optional.of(target));
//        when(sectionRepository.countBySchoolYear(target)).thenReturn(0);
//        when(sectionRepository.findAllBySchoolYear_SchoolYearIdAndGradeLevel(1L, GRADE)).thenReturn(List.of());
//
//        NewSchoolYearRequest request = new NewSchoolYearRequest(1L, 2L, GRADE);
//
//        assertThrows(SchoolYearSectionsNotFound.class, () -> sectionService.newSchoolYear(request));
//    }
//
//    @Test
//    void newSchoolYear_clonesAllSections_whenGradeLevelIsNull() {
//        SchoolYear current = mock(SchoolYear.class);
//        SchoolYear source = mock(SchoolYear.class);
//        when(source.getSchoolYearId()).thenReturn(1L);
//        SchoolYear target = mock(SchoolYear.class);
//        when(target.getSchoolYearId()).thenReturn(2L);
//        when(target.getSchoolYearStatus()).thenReturn(SchoolYearStatus.planning);
//
//        Section old1 = buildSection(1, "Section A", source, mock(User.class), GRADE, SectionStatus.active);
//        Section old2 = buildSection(2, "Section B", source, mock(User.class), GRADE, SectionStatus.active);
//        SectionResponse expectedResponse = mock(SectionResponse.class);
//
//        when(schoolYearLockRepository.acquireActivationLock()).thenReturn(Optional.of(new SchoolYearLock()));
//        when(schoolYearRepository.findBySchoolYearStatus(SchoolYearStatus.active)).thenReturn(Optional.of(current));
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(source));
//        when(schoolYearRepository.findById(2L)).thenReturn(Optional.of(target));
//        when(sectionRepository.countBySchoolYear(target)).thenReturn(0);
//        when(sectionRepository.findAllBySchoolYear_SchoolYearId(1L)).thenReturn(List.of(old1, old2));
//        when(sectionRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
//        when(sectionMapper.toResponseDTO(any(Section.class))).thenReturn(expectedResponse);
//
//        NewSchoolYearRequest request = new NewSchoolYearRequest(1L, 2L, null);
//
//        List<SectionResponse> result = sectionService.newSchoolYear(request);
//
//        assertEquals(2, result.size());
//        verify(current).setSchoolYearStatus(SchoolYearStatus.closed);
//        verify(target).setSchoolYearStatus(SchoolYearStatus.active);
//    }
//
//    @Test
//    void newSchoolYear_clonesOnlyMatchingGradeLevel_whenGradeLevelSpecified() {
//        SchoolYear current = mock(SchoolYear.class);
//        SchoolYear source = mock(SchoolYear.class);
//        when(source.getSchoolYearId()).thenReturn(1L);
//        SchoolYear target = mock(SchoolYear.class);
//        when(target.getSchoolYearId()).thenReturn(2L);
//        when(target.getSchoolYearStatus()).thenReturn(SchoolYearStatus.planning);
//
//        Section old1 = buildSection(1, "Section A", source, mock(User.class), GRADE, SectionStatus.active);
//        SectionResponse expectedResponse = mock(SectionResponse.class);
//
//        when(schoolYearLockRepository.acquireActivationLock()).thenReturn(Optional.of(new SchoolYearLock()));
//        when(schoolYearRepository.findBySchoolYearStatus(SchoolYearStatus.active)).thenReturn(Optional.of(current));
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(source));
//        when(schoolYearRepository.findById(2L)).thenReturn(Optional.of(target));
//        when(sectionRepository.countBySchoolYear(target)).thenReturn(0);
//        when(sectionRepository.findAllBySchoolYear_SchoolYearIdAndGradeLevel(1L, GRADE)).thenReturn(List.of(old1));
//        when(sectionRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
//        when(sectionMapper.toResponseDTO(any(Section.class))).thenReturn(expectedResponse);
//
//        NewSchoolYearRequest request = new NewSchoolYearRequest(1L, 2L, GRADE);
//
//        List<SectionResponse> result = sectionService.newSchoolYear(request);
//
//        assertEquals(1, result.size());
//    }
//
//    @Test
//    void newSchoolYear_throwsSchoolYearAlreadyHasSections_whenSaveAllHitsDataIntegrityViolation() {
//        SchoolYear current = mock(SchoolYear.class);
//        SchoolYear source = mock(SchoolYear.class);
//        when(source.getSchoolYearId()).thenReturn(1L);
//        SchoolYear target = mock(SchoolYear.class);
//        when(target.getSchoolYearId()).thenReturn(2L);
//        when(target.getSchoolYearStatus()).thenReturn(SchoolYearStatus.planning);
//
//        Section old1 = buildSection(1, "Section A", source, mock(User.class), GRADE, SectionStatus.active);
//
//        when(schoolYearLockRepository.acquireActivationLock()).thenReturn(Optional.of(new SchoolYearLock()));
//        when(schoolYearRepository.findBySchoolYearStatus(SchoolYearStatus.active)).thenReturn(Optional.of(current));
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(source));
//        when(schoolYearRepository.findById(2L)).thenReturn(Optional.of(target));
//        when(sectionRepository.countBySchoolYear(target)).thenReturn(0);
//        when(sectionRepository.findAllBySchoolYear_SchoolYearId(1L)).thenReturn(List.of(old1));
//        when(sectionRepository.saveAll(anyList())).thenThrow(new DataIntegrityViolationException("race condition"));
//
//        NewSchoolYearRequest request = new NewSchoolYearRequest(1L, 2L, null);
//
//        assertThrows(SchoolYearAlreadyHasSections.class, () -> sectionService.newSchoolYear(request));
//    }
//}
//package com.edutrack.schoolyear.service;
//
///*
// * ASSUMPTIONS (I don't have these source files, only how SchoolYearService.java
// * uses them):
// *  - CreateSchoolYearRequest(String schoolYearName, LocalDate startDate, LocalDate endDate)
// *  - UpdateSchoolYearRequest(String schoolYearName, LocalDate startDate, LocalDate endDate)
// *  - SchoolYearRepository has: existsBySchoolYearNameIgnoreCase(String),
// *    existsBySchoolYearStatusEquals(SchoolYearStatus), findById(Long),
// *    findAll(Specification<SchoolYear>, Pageable), save(SchoolYear), saveAndFlush(SchoolYear)
// *  - SchoolYearMapper has toEntity(CreateSchoolYearRequest), toResponseDTO(SchoolYear)
// *  - SchoolYearResponse's fields are unknown, so it's mocked and asserted by
// *    identity rather than by field values
// *  - Exception constructors follow the pattern seen elsewhere in the codebase:
// *    SchoolYearAlreadyExists(String), InvalidSchoolYearTransition(SchoolYearStatus, SchoolYearStatus),
// *    and no-arg for the rest (SchoolYearAlreadyArchived, SchoolYearAlreadyActive,
// *    ActiveSchoolYearAlreadyExists, SchoolYearAlreadyClosed, SchoolYearAlreadyPlanning,
// *    InvalidSchoolYearDateRange)
// *
// * NOTE: markAsPlanning has no test for a successful transition — per
// * ALLOWED_TRANSITIONS, no status ever allows transitioning INTO planning, so
// * that path is unreachable as the code is currently written. See chat.
// */
//
//import com.edutrack.schoolyear.dto.request.CreateSchoolYearRequest;
//import com.edutrack.schoolyear.dto.request.UpdateSchoolYearRequest;
//import com.edutrack.schoolyear.dto.response.SchoolYearResponse;
//import com.edutrack.schoolyear.entity.SchoolYear;
//import com.edutrack.schoolyear.entity.SchoolYearLock;
//import com.edutrack.schoolyear.enums.SchoolYearStatus;
//import com.edutrack.schoolyear.exception.*;
//import com.edutrack.schoolyear.mapper.SchoolYearMapper;
//import com.edutrack.schoolyear.repository.SchoolYearLockRepository;
//import com.edutrack.schoolyear.repository.SchoolYearRepository;
//import com.edutrack.shared.exception.NoChangesDetected;
//
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
//import org.springframework.data.jpa.domain.Specification;
//
//import java.time.LocalDate;
//import java.util.Optional;
//
//import static org.junit.jupiter.api.Assertions.*;
//import static org.mockito.ArgumentMatchers.*;
//import static org.mockito.Mockito.*;
//
//@ExtendWith(MockitoExtension.class)
//class SchoolYearServiceTest {
//
//    @Mock private SchoolYearRepository schoolYearRepository;
//    @Mock private SchoolYearMapper schoolYearMapper;
//    @Mock private SchoolYearLockRepository schoolYearLockRepository;
//
//    @InjectMocks
//    private SchoolYearService schoolYearService;
//
//    private SchoolYear buildSchoolYear(Long id, String name, LocalDate start, LocalDate end, SchoolYearStatus status) {
//        SchoolYear schoolYear = new SchoolYear();
//        schoolYear.setSchoolYearId(id);
//        schoolYear.setSchoolYearName(name);
//        schoolYear.setStartDate(start);
//        schoolYear.setEndDate(end);
//        schoolYear.setSchoolYearStatus(status);
//        return schoolYear;
//    }
//
//    // ---------------------------------------------------------------
//    // createSchoolYear
//    // ---------------------------------------------------------------
//
//    @Test
//    void createSchoolYear_savesAndReturnsResponse_whenValid() {
//        CreateSchoolYearRequest request = new CreateSchoolYearRequest(
//                "SY 2026-2027", LocalDate.of(2026, 6, 1), LocalDate.of(2027, 3, 31));
//
//        SchoolYear mappedEntity = new SchoolYear();
//        SchoolYear savedEntity = buildSchoolYear(1L, "SY 2026-2027",
//                LocalDate.of(2026, 6, 1), LocalDate.of(2027, 3, 31), SchoolYearStatus.planning);
//        SchoolYearResponse expectedResponse = mock(SchoolYearResponse.class);
//
//        when(schoolYearRepository.existsBySchoolYearNameIgnoreCase("SY 2026-2027")).thenReturn(false);
//        when(schoolYearMapper.toEntity(request)).thenReturn(mappedEntity);
//        when(schoolYearRepository.save(mappedEntity)).thenReturn(savedEntity);
//        when(schoolYearMapper.toResponseDTO(savedEntity)).thenReturn(expectedResponse);
//
//        SchoolYearResponse result = schoolYearService.createSchoolYear(request);
//
//        assertEquals(expectedResponse, result);
//        assertEquals(SchoolYearStatus.planning, mappedEntity.getSchoolYearStatus());
//        assertEquals("SY 2026-2027", mappedEntity.getSchoolYearName());
//    }
//
//    @Test
//    void createSchoolYear_throwsSchoolYearAlreadyExists_whenNameAlreadyTaken() {
//        CreateSchoolYearRequest request = new CreateSchoolYearRequest(
//                "SY 2026-2027", LocalDate.of(2026, 6, 1), LocalDate.of(2027, 3, 31));
//
//        when(schoolYearRepository.existsBySchoolYearNameIgnoreCase("SY 2026-2027")).thenReturn(true);
//
//        assertThrows(SchoolYearAlreadyExists.class, () -> schoolYearService.createSchoolYear(request));
//        verify(schoolYearMapper, never()).toEntity(any());
//    }
//
//    @Test
//    void createSchoolYear_throwsInvalidSchoolYearDateRange_whenStartNotBeforeEnd() {
//        CreateSchoolYearRequest request = new CreateSchoolYearRequest(
//                "SY 2026-2027", LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 1));
//
//        when(schoolYearRepository.existsBySchoolYearNameIgnoreCase("SY 2026-2027")).thenReturn(false);
//
//        assertThrows(InvalidSchoolYearDateRange.class, () -> schoolYearService.createSchoolYear(request));
//        verify(schoolYearMapper, never()).toEntity(any());
//    }
//
//    @Test
//    void createSchoolYear_throwsSchoolYearAlreadyExists_whenSaveHitsDataIntegrityViolation() {
//        CreateSchoolYearRequest request = new CreateSchoolYearRequest(
//                "SY 2026-2027", LocalDate.of(2026, 6, 1), LocalDate.of(2027, 3, 31));
//        SchoolYear mappedEntity = new SchoolYear();
//
//        when(schoolYearRepository.existsBySchoolYearNameIgnoreCase("SY 2026-2027")).thenReturn(false);
//        when(schoolYearMapper.toEntity(request)).thenReturn(mappedEntity);
//        when(schoolYearRepository.save(mappedEntity)).thenThrow(new DataIntegrityViolationException("duplicate"));
//
//        assertThrows(SchoolYearAlreadyExists.class, () -> schoolYearService.createSchoolYear(request));
//    }
//
//    // ---------------------------------------------------------------
//    // getSchoolYear
//    // ---------------------------------------------------------------
//
//    @Test
//    void getSchoolYear_returnsMappedPage() {
//        Pageable pageable = PageRequest.of(0, 10);
//        SchoolYear schoolYear = buildSchoolYear(1L, "SY 2025-2026",
//                LocalDate.of(2025, 6, 1), LocalDate.of(2026, 3, 31), SchoolYearStatus.active);
//        SchoolYearResponse expectedResponse = mock(SchoolYearResponse.class);
//
//        when(schoolYearRepository.findAll(any(Specification.class), eq(pageable)))
//                .thenReturn(new PageImpl<>(java.util.List.of(schoolYear)));
//        when(schoolYearMapper.toResponseDTO(schoolYear)).thenReturn(expectedResponse);
//
//        Page<SchoolYearResponse> result = schoolYearService.getSchoolYear(null, null, pageable);
//
//        assertEquals(1, result.getTotalElements());
//        assertEquals(expectedResponse, result.getContent().get(0));
//    }
//
//    // ---------------------------------------------------------------
//    // updateSchoolYear
//    // ---------------------------------------------------------------
//
//    @Test
//    void updateSchoolYear_throwsSchoolYearNotFound_whenNotFound() {
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.empty());
//        UpdateSchoolYearRequest request = new UpdateSchoolYearRequest("New Name", null, null);
//
//        assertThrows(SchoolYearNotFound.class, () -> schoolYearService.updateSchoolYear(1L, request));
//    }
//
//    @Test
//    void updateSchoolYear_throwsNoChangesDetected_whenRequestIsEmpty() {
//        SchoolYear existing = buildSchoolYear(1L, "SY 2025-2026",
//                LocalDate.of(2025, 6, 1), LocalDate.of(2026, 3, 31), SchoolYearStatus.planning);
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(existing));
//
//        UpdateSchoolYearRequest request = new UpdateSchoolYearRequest(null, null, null);
//
//        assertThrows(NoChangesDetected.class, () -> schoolYearService.updateSchoolYear(1L, request));
//        verify(schoolYearRepository, never()).saveAndFlush(any());
//    }
//
//    @Test
//    void updateSchoolYear_throwsSchoolYearAlreadyExists_whenNewNameConflicts() {
//        SchoolYear existing = buildSchoolYear(1L, "SY 2025-2026",
//                LocalDate.of(2025, 6, 1), LocalDate.of(2026, 3, 31), SchoolYearStatus.planning);
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(existing));
//        when(schoolYearRepository.existsBySchoolYearNameIgnoreCase("SY 2026-2027")).thenReturn(true);
//
//        UpdateSchoolYearRequest request = new UpdateSchoolYearRequest("SY 2026-2027", null, null);
//
//        assertThrows(SchoolYearAlreadyExists.class, () -> schoolYearService.updateSchoolYear(1L, request));
//        verify(schoolYearRepository, never()).saveAndFlush(any());
//    }
//
//    @Test
//    void updateSchoolYear_savesNewName_whenNoConflict() {
//        SchoolYear existing = buildSchoolYear(1L, "SY 2025-2026",
//                LocalDate.of(2025, 6, 1), LocalDate.of(2026, 3, 31), SchoolYearStatus.planning);
//        SchoolYearResponse expectedResponse = mock(SchoolYearResponse.class);
//
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(existing));
//        when(schoolYearRepository.existsBySchoolYearNameIgnoreCase("SY 2026-2027")).thenReturn(false);
//        when(schoolYearRepository.saveAndFlush(existing)).thenReturn(existing);
//        when(schoolYearMapper.toResponseDTO(existing)).thenReturn(expectedResponse);
//
//        UpdateSchoolYearRequest request = new UpdateSchoolYearRequest("SY 2026-2027", null, null);
//
//        SchoolYearResponse result = schoolYearService.updateSchoolYear(1L, request);
//
//        assertEquals(expectedResponse, result);
//        assertEquals("SY 2026-2027", existing.getSchoolYearName());
//    }
//
//    @Test
//    void updateSchoolYear_savesNewDates_whenChanged() {
//        SchoolYear existing = buildSchoolYear(1L, "SY 2025-2026",
//                LocalDate.of(2025, 6, 1), LocalDate.of(2026, 3, 31), SchoolYearStatus.planning);
//        SchoolYearResponse expectedResponse = mock(SchoolYearResponse.class);
//        LocalDate newStart = LocalDate.of(2025, 6, 15);
//        LocalDate newEnd = LocalDate.of(2026, 4, 15);
//
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(existing));
//        when(schoolYearRepository.saveAndFlush(existing)).thenReturn(existing);
//        when(schoolYearMapper.toResponseDTO(existing)).thenReturn(expectedResponse);
//
//        UpdateSchoolYearRequest request = new UpdateSchoolYearRequest(null, newStart, newEnd);
//
//        SchoolYearResponse result = schoolYearService.updateSchoolYear(1L, request);
//
//        assertEquals(expectedResponse, result);
//        assertEquals(newStart, existing.getStartDate());
//        assertEquals(newEnd, existing.getEndDate());
//    }
//
//    @Test
//    void updateSchoolYear_throwsInvalidSchoolYearDateRange_whenResultingRangeInvalid() {
//        SchoolYear existing = buildSchoolYear(1L, "SY 2025-2026",
//                LocalDate.of(2025, 6, 1), LocalDate.of(2026, 3, 31), SchoolYearStatus.planning);
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(existing));
//
//        // new start date lands after the existing (unchanged) end date
//        UpdateSchoolYearRequest request = new UpdateSchoolYearRequest(null, LocalDate.of(2026, 4, 1), null);
//
//        assertThrows(InvalidSchoolYearDateRange.class, () -> schoolYearService.updateSchoolYear(1L, request));
//        verify(schoolYearRepository, never()).saveAndFlush(any());
//    }
//
//    @Test
//    void updateSchoolYear_throwsSchoolYearAlreadyExists_whenSaveAndFlushHitsDataIntegrityViolation() {
//        SchoolYear existing = buildSchoolYear(1L, "SY 2025-2026",
//                LocalDate.of(2025, 6, 1), LocalDate.of(2026, 3, 31), SchoolYearStatus.planning);
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(existing));
//        when(schoolYearRepository.saveAndFlush(existing)).thenThrow(new DataIntegrityViolationException("duplicate"));
//
//        UpdateSchoolYearRequest request = new UpdateSchoolYearRequest(null, LocalDate.of(2025, 6, 15), null);
//
//        assertThrows(SchoolYearAlreadyExists.class, () -> schoolYearService.updateSchoolYear(1L, request));
//    }
//
//    // ---------------------------------------------------------------
//    // archiveSchoolYear
//    // ---------------------------------------------------------------
//
//    @Test
//    void archiveSchoolYear_throwsSchoolYearNotFound_whenNotFound() {
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.empty());
//
//        assertThrows(SchoolYearNotFound.class, () -> schoolYearService.archiveSchoolYear(1L));
//    }
//
//    @Test
//    void archiveSchoolYear_throwsSchoolYearAlreadyArchived_whenAlreadyArchived() {
//        SchoolYear existing = buildSchoolYear(1L, "SY 2025-2026",
//                LocalDate.of(2025, 6, 1), LocalDate.of(2026, 3, 31), SchoolYearStatus.archived);
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(existing));
//
//        assertThrows(SchoolYearAlreadyArchived.class, () -> schoolYearService.archiveSchoolYear(1L));
//    }
//
//    @Test
//    void archiveSchoolYear_archivesSuccessfully_whenActive() {
//        SchoolYear existing = buildSchoolYear(1L, "SY 2025-2026",
//                LocalDate.of(2025, 6, 1), LocalDate.of(2026, 3, 31), SchoolYearStatus.active);
//        SchoolYearResponse expectedResponse = mock(SchoolYearResponse.class);
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(existing));
//        when(schoolYearMapper.toResponseDTO(existing)).thenReturn(expectedResponse);
//
//        SchoolYearResponse result = schoolYearService.archiveSchoolYear(1L);
//
//        assertEquals(expectedResponse, result);
//        assertEquals(SchoolYearStatus.archived, existing.getSchoolYearStatus());
//    }
//
//    // ---------------------------------------------------------------
//    // restoreSchoolYear (mark as active)
//    // ---------------------------------------------------------------
//
//    @Test
//    void restoreSchoolYear_throwsActiveSchoolYearLockUnavailable_whenLockNotAcquired() {
//        when(schoolYearLockRepository.acquireActivationLock()).thenReturn(Optional.empty());
//
//        assertThrows(ActiveSchoolYearLockUnavailable.class, () -> schoolYearService.restoreSchoolYear(1L));
//        verifyNoInteractions(schoolYearRepository);
//    }
//
//    @Test
//    void restoreSchoolYear_throwsSchoolYearNotFound_whenNotFound() {
//        when(schoolYearLockRepository.acquireActivationLock()).thenReturn(Optional.of(new SchoolYearLock()));
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.empty());
//
//        assertThrows(SchoolYearNotFound.class, () -> schoolYearService.restoreSchoolYear(1L));
//    }
//
//    @Test
//    void restoreSchoolYear_throwsSchoolYearAlreadyActive_whenAlreadyActive() {
//        SchoolYear existing = buildSchoolYear(1L, "SY 2025-2026",
//                LocalDate.of(2025, 6, 1), LocalDate.of(2026, 3, 31), SchoolYearStatus.active);
//        when(schoolYearLockRepository.acquireActivationLock()).thenReturn(Optional.of(new SchoolYearLock()));
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(existing));
//
//        assertThrows(SchoolYearAlreadyActive.class, () -> schoolYearService.restoreSchoolYear(1L));
//    }
//
//    @Test
//    void restoreSchoolYear_throwsInvalidSchoolYearTransition_whenFromClosed() {
//        SchoolYear existing = buildSchoolYear(1L, "SY 2024-2025",
//                LocalDate.of(2024, 6, 1), LocalDate.of(2025, 3, 31), SchoolYearStatus.closed);
//        when(schoolYearLockRepository.acquireActivationLock()).thenReturn(Optional.of(new SchoolYearLock()));
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(existing));
//
//        assertThrows(InvalidSchoolYearTransition.class, () -> schoolYearService.restoreSchoolYear(1L));
//    }
//
//    @Test
//    void restoreSchoolYear_throwsActiveSchoolYearAlreadyExists_whenAnotherYearIsActive() {
//        SchoolYear existing = buildSchoolYear(1L, "SY 2026-2027",
//                LocalDate.of(2026, 6, 1), LocalDate.of(2027, 3, 31), SchoolYearStatus.planning);
//        when(schoolYearLockRepository.acquireActivationLock()).thenReturn(Optional.of(new SchoolYearLock()));
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(existing));
//        when(schoolYearRepository.existsBySchoolYearStatusEquals(SchoolYearStatus.active)).thenReturn(true);
//
//        assertThrows(ActiveSchoolYearAlreadyExists.class, () -> schoolYearService.restoreSchoolYear(1L));
//    }
//
//    @Test
//    void restoreSchoolYear_restoresSuccessfully_whenPlanningAndNoOtherActiveYear() {
//        SchoolYear existing = buildSchoolYear(1L, "SY 2026-2027",
//                LocalDate.of(2026, 6, 1), LocalDate.of(2027, 3, 31), SchoolYearStatus.planning);
//        SchoolYearResponse expectedResponse = mock(SchoolYearResponse.class);
//        when(schoolYearLockRepository.acquireActivationLock()).thenReturn(Optional.of(new SchoolYearLock()));
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(existing));
//        when(schoolYearRepository.existsBySchoolYearStatusEquals(SchoolYearStatus.active)).thenReturn(false);
//        when(schoolYearMapper.toResponseDTO(existing)).thenReturn(expectedResponse);
//
//        SchoolYearResponse result = schoolYearService.restoreSchoolYear(1L);
//
//        assertEquals(expectedResponse, result);
//        assertEquals(SchoolYearStatus.active, existing.getSchoolYearStatus());
//    }
//
//    // ---------------------------------------------------------------
//    // closeSchoolYear
//    // ---------------------------------------------------------------
//
//    @Test
//    void closeSchoolYear_throwsSchoolYearNotFound_whenNotFound() {
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.empty());
//
//        assertThrows(SchoolYearNotFound.class, () -> schoolYearService.closeSchoolYear(1L));
//    }
//
//    @Test
//    void closeSchoolYear_throwsSchoolYearAlreadyClosed_whenAlreadyClosed() {
//        SchoolYear existing = buildSchoolYear(1L, "SY 2025-2026",
//                LocalDate.of(2025, 6, 1), LocalDate.of(2026, 3, 31), SchoolYearStatus.closed);
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(existing));
//
//        assertThrows(SchoolYearAlreadyClosed.class, () -> schoolYearService.closeSchoolYear(1L));
//    }
//
//    @Test
//    void closeSchoolYear_throwsInvalidSchoolYearTransition_whenFromPlanning() {
//        SchoolYear existing = buildSchoolYear(1L, "SY 2025-2026",
//                LocalDate.of(2025, 6, 1), LocalDate.of(2026, 3, 31), SchoolYearStatus.planning);
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(existing));
//
//        assertThrows(InvalidSchoolYearTransition.class, () -> schoolYearService.closeSchoolYear(1L));
//    }
//
//    @Test
//    void closeSchoolYear_closesSuccessfully_whenActive() {
//        SchoolYear existing = buildSchoolYear(1L, "SY 2025-2026",
//                LocalDate.of(2025, 6, 1), LocalDate.of(2026, 3, 31), SchoolYearStatus.active);
//        SchoolYearResponse expectedResponse = mock(SchoolYearResponse.class);
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(existing));
//        when(schoolYearMapper.toResponseDTO(existing)).thenReturn(expectedResponse);
//
//        SchoolYearResponse result = schoolYearService.closeSchoolYear(1L);
//
//        assertEquals(expectedResponse, result);
//        assertEquals(SchoolYearStatus.closed, existing.getSchoolYearStatus());
//    }
//
//    // ---------------------------------------------------------------
//    // markAsPlanning
//    // ---------------------------------------------------------------
//
//    @Test
//    void markAsPlanning_throwsSchoolYearNotFound_whenNotFound() {
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.empty());
//
//        assertThrows(SchoolYearNotFound.class, () -> schoolYearService.markAsPlanning(1L));
//    }
//
//    @Test
//    void markAsPlanning_throwsSchoolYearAlreadyPlanning_whenAlreadyPlanning() {
//        SchoolYear existing = buildSchoolYear(1L, "SY 2025-2026",
//                LocalDate.of(2025, 6, 1), LocalDate.of(2026, 3, 31), SchoolYearStatus.planning);
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(existing));
//
//        assertThrows(SchoolYearAlreadyPlanning.class, () -> schoolYearService.markAsPlanning(1L));
//    }
//
//    @Test
//    void markAsPlanning_throwsInvalidSchoolYearTransition_whenFromActive() {
//        // No status's allowed-transition set includes `planning` as a target,
//        // so every non-planning status hits this branch — see file header note.
//        SchoolYear existing = buildSchoolYear(1L, "SY 2025-2026",
//                LocalDate.of(2025, 6, 1), LocalDate.of(2026, 3, 31), SchoolYearStatus.active);
//        when(schoolYearRepository.findById(1L)).thenReturn(Optional.of(existing));
//
//        assertThrows(InvalidSchoolYearTransition.class, () -> schoolYearService.markAsPlanning(1L));
//    }
//}
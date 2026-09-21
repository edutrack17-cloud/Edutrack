package com.edutrack.section.controller;

import com.edutrack.section.dto.request.*;
import com.edutrack.section.dto.response.SectionResponse;
import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.enums.SectionStatus;
import com.edutrack.section.exception.AdviserRequired;
import com.edutrack.section.service.SectionService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/section")
public class SectionController {

    private final SectionService sectionService;

    public SectionController(SectionService sectionService) {
        this.sectionService = sectionService;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<SectionResponse> createSection(
            @Valid @RequestBody CreateSectionRequest sectionRequest) {

        // Manual creation always requires an adviser. Clone paths call
        // SectionService.createSection directly and skip this check.
        if (sectionRequest.userId() == null) {
            throw new AdviserRequired();
        }

        SectionResponse savedSection = sectionService.createSection(sectionRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedSection);
    }

    // CLONE (used by the frontend's cloneSectionsAcrossSchoolYears flow) —
    // adviser is optional here, unlike the manual-create endpoint above.
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/clone")
    public ResponseEntity<SectionResponse> cloneSection(
            @Valid @RequestBody CloneSectionRequest cloneRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(sectionService.cloneSection(cloneRequest));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/clone/batch")
    public ResponseEntity<List<SectionResponse>> cloneSectionBatch(
            @Valid @RequestBody CloneSectionBatchRequest batchRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(sectionService.cloneSectionBatch(batchRequest));
    }

    //READ
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<Page<SectionResponse>> getSection(
            @RequestParam(required = false) String fullName,
            @RequestParam(required = false) GradeLevel gradeLevel,
            @RequestParam(required = false) SectionStatus sectionStatus,
            @RequestParam(required = false) String sectionName,
            @RequestParam(required = false) Long schoolYearId,
            Pageable pageable) {
        return ResponseEntity.ok(
                sectionService.getSection(fullName, gradeLevel, sectionStatus, sectionName, schoolYearId, pageable)
        );
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("count-by-school-year")
    public ResponseEntity<Long> countBySchoolYear(@RequestParam Long schoolYearId) {
        return ResponseEntity.ok(sectionService.countBySchoolYear(schoolYearId));
    }

    // READ BY ADVISER
    // CHANGED: path moved from "{userId}" to "adviser/{userId}" so that
    // "GET /api/section/{id}" can now correctly mean "get section by id"
    // instead of "get sections advised by user id".
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping("adviser/{userId}")
    public ResponseEntity<List<SectionResponse>> readSectionByAdviser(@PathVariable Long userId) {
        return ResponseEntity.ok(sectionService.readSectionByAdviser(userId));
    }

    // NEW: GET a single section by its sectionId.
    // This is what the frontend's `GET /api/section/3` calls actually want,
    // and it's the fix for the 404 error that was being logged.
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping("{sectionId}")
    public ResponseEntity<SectionResponse> getSectionById(@PathVariable Integer sectionId) {
        return ResponseEntity.ok(sectionService.getSectionById(sectionId));
    }

    //SECTION DROPDOWN
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping("dropdown")
    public ResponseEntity<List<SectionResponse>> sectionDropdown(@RequestParam(required = false) GradeLevel gradeLevel) {
        return ResponseEntity.ok(sectionService.sectionDropDown(gradeLevel));
    }

    //UPDATE
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{sectionId}")
    public ResponseEntity<SectionResponse> updateSection(
            @PathVariable Integer sectionId,
            @Valid @RequestBody UpdateSectionRequest updateSectionRequest) {
        SectionResponse response = sectionService.updateSection(sectionId, updateSectionRequest);
        return ResponseEntity.ok(response);
    }

    //ARCHIVE
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("{sectionId}/section-status/archive")
    public ResponseEntity<SectionResponse> archiveSection(@PathVariable Integer sectionId) {
        SectionResponse response = sectionService.archiveSection(sectionId);
        return ResponseEntity.ok(response);
    }

    //RESTORE
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("{sectionId}/section-status/active")
    public ResponseEntity<SectionResponse> restoreSection(@PathVariable Integer sectionId) {
        SectionResponse response = sectionService.restoreSection(sectionId);
        return ResponseEntity.ok(response);
    }

    //START NEW SCHOOL YEAR
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("school-year/new-school-year")
    public ResponseEntity<List<SectionResponse>> startNewSchoolYear(@Valid @RequestBody NewSchoolYearRequest request) {
        return ResponseEntity.ok(sectionService.newSchoolYear(request));
    }
}
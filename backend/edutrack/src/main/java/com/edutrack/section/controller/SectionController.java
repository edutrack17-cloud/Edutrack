package com.edutrack.section.controller;

import com.edutrack.section.dto.request.CreateSectionRequest;
import com.edutrack.section.dto.request.NewSchoolYearRequest;
import com.edutrack.section.dto.request.UpdateSectionRequest;
import com.edutrack.section.dto.response.SectionResponse;
import com.edutrack.section.entity.Section;
import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.enums.SectionStatus;
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

    public SectionController(SectionService sectionService){
        this.sectionService = sectionService;
    }

    //CREATE
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<SectionResponse> createSection(@Valid @RequestBody CreateSectionRequest sectionRequest){
        SectionResponse savedSection = sectionService.createSection(sectionRequest);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(savedSection);
    }

    //READ
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<Page<SectionResponse>> getSection(@RequestParam(required = false) String fullName,
                                                            @RequestParam(required = false) GradeLevel gradeLevel,
                                                            @RequestParam(required = false) SectionStatus sectionStatus,
                                                            @RequestParam(required = false) String sectionName,
                                                            Pageable pageable){
        return ResponseEntity
                .ok(sectionService.getSection(fullName, gradeLevel, sectionStatus, sectionName, pageable));
    }

    //READ BY ADVISER
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping("{userId}")
    public ResponseEntity<List<SectionResponse>> readSectionByAdviser(@PathVariable Long userId){
        return ResponseEntity.ok(sectionService.readSectionByAdviser(userId));
    }

    //SECTION DROPDOWN
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping("dropdown")
    public ResponseEntity<List<SectionResponse>> sectionDropdown(@RequestParam(required = false) GradeLevel gradeLevel){
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
    public ResponseEntity<List<SectionResponse>> startNewSchoolYear(@Valid @RequestBody NewSchoolYearRequest request){
        return ResponseEntity.ok(sectionService.newSchoolYear(request));
    }


}

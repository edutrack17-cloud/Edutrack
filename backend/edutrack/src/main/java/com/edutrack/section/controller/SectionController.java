package com.edutrack.section.controller;

import com.edutrack.section.dto.request.CreateSectionRequest;
import com.edutrack.section.dto.request.UpdateSectionRequest;
import com.edutrack.section.dto.response.SectionResponse;
import com.edutrack.section.service.SectionService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/section")
public class SectionController {
    private final SectionService sectionService;

    public SectionController(SectionService sectionService){
        this.sectionService = sectionService;
    }

    //CREATE
    @PostMapping
    public ResponseEntity<SectionResponse> createSection(@Valid @RequestBody CreateSectionRequest sectionRequest){
        SectionResponse savedSection = sectionService.createSection(sectionRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedSection);
    }

    //READ
    @GetMapping
    public ResponseEntity<Page<SectionResponse>> getSections(Pageable pageable, @RequestParam(required = false) String fullName){
        return ResponseEntity.ok(sectionService.getSections(fullName, pageable));
    }

    //UPDATE
    @PatchMapping("{sectionId}")
    public ResponseEntity<SectionResponse> updateSection(@PathVariable int sectionId, @RequestBody UpdateSectionRequest updateRequest){
        SectionResponse updatedSection = sectionService.updateSection(sectionId, updateRequest);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(updatedSection);
    }

    //ARCHIVE
    @PatchMapping("archive/{sectionId}")
    public ResponseEntity<SectionResponse> archiveSection(@PathVariable int sectionId){
        SectionResponse archivedSection = sectionService.archiveSection(sectionId);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(archivedSection);
    }

    //RESTORE
    @PatchMapping("restore/{sectionId}")
    public ResponseEntity<SectionResponse> restoreSection(@PathVariable int sectionId){
        SectionResponse restoredSection = sectionService.restoreSection(sectionId);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(restoredSection);
    }

}

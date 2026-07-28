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
//
//    //CREATE
//    @PostMapping
//    public ResponseEntity<SectionResponse> createSection(@Valid @RequestBody CreateSectionRequest sectionRequest){
//        SectionResponse savedSection = sectionService.createSection(sectionRequest);
//        return ResponseEntity.status(HttpStatus.CREATED).body(savedSection);
//    }
//
//    //READ
//    @GetMapping
//    public ResponseEntity<Page<SectionResponse>> getSections(Pageable pageable, @RequestParam(required = false) String fullName){
//        return ResponseEntity.ok(sectionService.getSections(fullName, pageable));
//    }
//


}

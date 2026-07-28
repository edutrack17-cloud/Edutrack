package com.edutrack.schoolyear.controller;

import com.edutrack.schoolyear.dto.request.CreateSchoolYearRequest;
import com.edutrack.schoolyear.dto.request.UpdateSchoolYearRequest;
import com.edutrack.schoolyear.dto.response.SchoolYearResponse;
import com.edutrack.schoolyear.enums.SchoolYearStatus;
import com.edutrack.schoolyear.service.SchoolYearService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/school-year")
public class SchoolYearController {
    private final SchoolYearService schoolYearService;

    public SchoolYearController(SchoolYearService schoolYearService) {
        this.schoolYearService = schoolYearService;
    }

    //CREATE
    @PostMapping
    public ResponseEntity<SchoolYearResponse> createSchoolYear(@Valid @RequestBody CreateSchoolYearRequest schoolYearRequest){
        SchoolYearResponse savedSchoolYear = schoolYearService.createSchoolYear(schoolYearRequest);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(savedSchoolYear);
    }

    //READ
    @GetMapping
    public ResponseEntity<Page<SchoolYearResponse>> getSchoolYear(@RequestParam(required = false) String schoolYearName,
                                                                  @RequestParam(required = false) SchoolYearStatus schoolYearStatus,
                                                                  Pageable pageable){
        return ResponseEntity.ok(schoolYearService.getSchoolYear(schoolYearName, schoolYearStatus, pageable));
    }

    //UPDATE
    @PatchMapping("{schoolYearId}")
    public ResponseEntity<SchoolYearResponse> updateSchoolYear(@PathVariable Long schoolYearId, @RequestBody UpdateSchoolYearRequest updateSchoolYearRequest){
        SchoolYearResponse updatedSchoolYear = schoolYearService.updateSchoolYear(schoolYearId, updateSchoolYearRequest);
        return ResponseEntity
                .status(HttpStatus.ACCEPTED)
                .body(updatedSchoolYear);
    }

    //ARCHIVE
    @PatchMapping("{schoolYearId}/school-year-status/archive")
    public ResponseEntity<SchoolYearResponse> archiveSchoolYear(@PathVariable Long schoolYearId){
        SchoolYearResponse archivedSchoolYear = schoolYearService.archiveSchoolYear(schoolYearId);
        return ResponseEntity
                .status(HttpStatus.ACCEPTED)
                .body(archivedSchoolYear);
    }

    //RESTORE
    @PatchMapping("{schoolYearId}/school-year-status/active")
    public ResponseEntity<SchoolYearResponse> restoreSchoolYear(@PathVariable Long schoolYearId){
        SchoolYearResponse restoredSchoolYear = schoolYearService.restoreSchoolYear(schoolYearId);
        return ResponseEntity
                .status(HttpStatus.ACCEPTED)
                .body(restoredSchoolYear);
    }

    //MARK AS PLANNING
    @PatchMapping("{schoolYearId}/school-year-status/planning")
    public ResponseEntity<SchoolYearResponse> markAsPlanning(@PathVariable Long schoolYearId){
        SchoolYearResponse markedAsPlanning = schoolYearService.markAsPlanning(schoolYearId);
        return ResponseEntity
                .status(HttpStatus.ACCEPTED)
                .body(markedAsPlanning);
    }

}

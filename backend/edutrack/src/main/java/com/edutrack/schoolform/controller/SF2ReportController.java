package com.edutrack.schoolform.controller;

import com.edutrack.schoolform.dto.request.SF2ReportRequest;
import com.edutrack.schoolform.dto.request.SF2TableRequest;
import com.edutrack.schoolform.dto.response.SF2TableResponse;
import com.edutrack.schoolform.service.SF2ReportService;
import com.edutrack.schoolform.service.SF2TableService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;

@RestController
@RequestMapping("api/schoolform/sf2")
public class SF2ReportController {

    private final SF2ReportService sf2ReportService;
    private final SF2TableService sf2TableService; // Inject the new service

    public SF2ReportController(SF2ReportService sf2ReportService, SF2TableService sf2TableService) {
        this.sf2ReportService = sf2ReportService;
        this.sf2TableService = sf2TableService;
    }

    @GetMapping("/{sectionId}")
    public ResponseEntity<byte[]> generateReport(
            @PathVariable Integer sectionId,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth period) {

        byte[] file = sf2ReportService.generateReport(new SF2ReportRequest(sectionId, period));
        String filename = "SF2_" + period + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(filename).build().toString())
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(file);
    }

    @GetMapping("/table")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('TEACHER') and @studentAccessService.isAdviserOfSectionId(#request.sectionId()))")
    public ResponseEntity<SF2TableResponse> getSF2Table(
            @RequestParam Integer sectionId,
            @RequestParam Long schoolYearId,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth period) {

        SF2TableRequest request = new SF2TableRequest(sectionId, schoolYearId, period);
        SF2TableResponse response = sf2TableService.getSF2TableData(request);
        return ResponseEntity.ok(response);
    }
}
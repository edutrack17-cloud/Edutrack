package com.edutrack.schoolform.controller;

import com.edutrack.schoolform.dto.request.SF2ReportRequest;
import com.edutrack.schoolform.service.SF2ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;

@RestController
@RequestMapping("api/schoolform/sf2")
public class SF2ReportController {

    private final SF2ReportService sf2ReportService;

    public SF2ReportController(SF2ReportService sf2ReportService) {
        this.sf2ReportService = sf2ReportService;
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
}
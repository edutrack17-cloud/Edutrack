package com.edutrack.sms.controller;

import com.edutrack.sms.dto.request.SmsRequest;
import com.edutrack.sms.dto.response.SmsResponse;
import com.edutrack.sms.service.SmsService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sms")
public class SmsController {

    private final SmsService smsService;

    public SmsController(SmsService smsService) {
        this.smsService = smsService;
    }

    @PostMapping("/send")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SmsResponse> sendSms(@Valid @RequestBody SmsRequest request) {
        SmsResponse response = smsService.sendSms(request);

        if (response.success()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
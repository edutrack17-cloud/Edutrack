package com.edutrack.sms.service;

import com.edutrack.sms.config.SmsConfig;
import com.edutrack.sms.dto.request.SmsRequest;
import com.edutrack.sms.dto.response.SmsResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class SmsService {

    private static final Logger log = LoggerFactory.getLogger(SmsService.class);

    private final RestTemplate restTemplate;
    private final SmsConfig.TextBeeProperties properties;

    public SmsService(@Qualifier("smsRestTemplate") RestTemplate restTemplate,
                      SmsConfig.TextBeeProperties properties) {
        this.restTemplate = restTemplate;
        this.properties = properties;
    }

    public SmsResponse sendSms(SmsRequest request) {
        String url = properties.baseUrl() + "/gateway/send-sms";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", properties.apiKey());

        Map<String, Object> body = Map.of(
                "recipients", List.of(request.phoneNumber()),
                "message", request.message()
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    url, HttpMethod.POST, entity, Map.class
            );

            String batchId = null;
            if (response.getBody() != null) {
                Object rawBatchId = response.getBody().get("smsBatchId");
                if (rawBatchId != null) {
                    batchId = rawBatchId.toString();
                }
            }

            log.info("SMS queued to {} (batchId={})", request.phoneNumber(), batchId);
            return new SmsResponse(true, "SMS queued successfully", batchId);

        } catch (Exception e) {
            log.error("Failed to send SMS to {}: {}", request.phoneNumber(), e.getMessage());
            return new SmsResponse(false, "Failed to send SMS: " + e.getMessage(), null);
        }
    }

    public void sendAttendanceNotification(String phoneNumber, String studentName) {
        String message = String.format(
                "Hi %s, your attendance has been recorded for today.", studentName
        );
        sendSms(new SmsRequest(phoneNumber, message));
    }
}
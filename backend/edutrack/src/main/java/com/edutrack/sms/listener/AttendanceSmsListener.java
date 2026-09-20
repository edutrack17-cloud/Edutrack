package com.edutrack.sms.listener;

import com.edutrack.attendance.event.AttendanceStatusChangedEvent;
import com.edutrack.attendance.event.AttendanceStatusChangedEvent.NotificationType;
import com.edutrack.shared.util.NameUtil;
import com.edutrack.sms.dto.request.SmsRequest;
import com.edutrack.sms.dto.response.SmsResponse;
import com.edutrack.sms.entity.SmsLog;
import com.edutrack.sms.enums.SmsStatus;
import com.edutrack.sms.repository.SmsLogRepository;
import com.edutrack.sms.service.SmsService;
import com.edutrack.student.entity.Student;
import com.edutrack.student.repository.StudentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

@Component
public class AttendanceSmsListener {

    private static final Logger log = LoggerFactory.getLogger(AttendanceSmsListener.class);

    private static final DateTimeFormatter SMS_TIME_FORMAT =
            DateTimeFormatter.ofPattern("h:mm a");

    private final SmsService smsService;
    private final StudentRepository studentRepository;
    private final SmsLogRepository smsLogRepository;

    public AttendanceSmsListener(SmsService smsService,
                                 StudentRepository studentRepository,
                                 SmsLogRepository smsLogRepository) {
        this.smsService = smsService;
        this.studentRepository = studentRepository;
        this.smsLogRepository = smsLogRepository;
    }

    @Async("smsTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAttendanceStatusChanged(AttendanceStatusChangedEvent event) {
        try {
            Student student = studentRepository.findById(event.studentId()).orElse(null);
            if (student == null) {
                log.warn("SMS skipped: student {} not found", event.studentId());
                return;
            }

            String localPhone = student.getGuardianPhoneNumber();
            if (localPhone == null || localPhone.isBlank()) {
                log.warn("SMS skipped: no guardian phone for student {}", event.studentId());
                return;
            }

            String phoneE164 = toE164(localPhone);
            String message = buildMessage(student, event.notificationType());

            // 1. Persist PENDING row before the send attempt
            SmsLog logEntry = new SmsLog();
            logEntry.setStudentId(student.getStudentId());
            logEntry.setRecipientPhone(phoneE164);
            logEntry.setMessage(message);
            logEntry.setTriggerStatus(event.status());
            logEntry.setStatus(SmsStatus.PENDING);
            logEntry = smsLogRepository.save(logEntry);

            // 2. Attempt the send
            try {
                SmsResponse response = smsService.sendSms(new SmsRequest(phoneE164, message));

                if (response.success()) {
                    logEntry.setStatus(SmsStatus.QUEUED);
                    logEntry.setProviderBatchId(response.batchId());
                    logEntry.setSentAt(LocalDateTime.now());
                } else {
                    logEntry.setStatus(SmsStatus.FAILED);
                    logEntry.setErrorMessage(truncate(response.message(), 500));
                }
            } catch (Exception sendEx) {
                logEntry.setStatus(SmsStatus.FAILED);
                logEntry.setErrorMessage(truncate(sendEx.getMessage(), 500));
                log.error("SMS send failed for student {}: {}",
                        event.studentId(), sendEx.getMessage());
            }

            // 3. Persist the final state
            smsLogRepository.save(logEntry);

        } catch (Exception e) {
            log.error("Unexpected error in SMS listener for student {}: {}",
                    event.studentId(), e.getMessage(), e);
        }
    }

    private String buildMessage(Student student, NotificationType type) {
        String fullName = NameUtil.buildFullName(
                student.getFirstName(),
                student.getMiddleName(),
                student.getLastName()
        );

        String time = LocalTime.now()
                .withNano(0)
                .format(SMS_TIME_FORMAT);

        return switch (type) {
            case TIME_IN -> String.format(
                    "Hi, this is EduTrack. Your child %s already arrived at school at %s.",
                    fullName,
                    time
            );
            case TIME_OUT -> String.format(
                    "Hi, this is EduTrack. Your child %s is already outside the school at %s.",
                    fullName,
                    time
            );
        };
    }

    private String toE164(String localPhone) {
        String digits = localPhone.replaceAll("\\D", "");

        if (digits.startsWith("63") && digits.length() == 12) {
            return "+" + digits;
        }
        if (digits.startsWith("0") && digits.length() == 11) {
            return "+63" + digits.substring(1);
        }
        if (digits.startsWith("9") && digits.length() == 10) {
            return "+63" + digits;
        }
        return "+" + digits;
    }

    private String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
package com.edutrack.sms.repository;

import com.edutrack.sms.entity.SmsLog;
import com.edutrack.sms.enums.SmsStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SmsLogRepository extends JpaRepository<SmsLog, Long> {

    List<SmsLog> findByStudentIdOrderByCreatedAtDesc(Long studentId);

    List<SmsLog> findByStatusOrderByCreatedAtAsc(SmsStatus status);

    long countByStatusAndCreatedAtAfter(SmsStatus status, LocalDateTime after);
}
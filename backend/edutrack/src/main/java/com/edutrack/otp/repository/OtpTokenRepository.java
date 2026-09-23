package com.edutrack.otp.repository;

import com.edutrack.otp.entity.OtpToken;
import com.edutrack.otp.enums.OtpPurpose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface OtpTokenRepository extends JpaRepository<OtpToken, Long> {

    Optional<OtpToken> findTopByUserIdAndPurposeAndConsumedFalseOrderByCreatedAtDesc(
            Long userId, OtpPurpose purpose);

    @Modifying
    @Query("""
        UPDATE OtpToken o
           SET o.consumed = true, o.consumedAt = :now
         WHERE o.userId = :userId
           AND o.purpose = :purpose
           AND o.consumed = false
    """)
    void invalidateAllFor(Long userId, OtpPurpose purpose, LocalDateTime now);
}
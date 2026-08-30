package com.edutrack.schoolyear.repository;

import com.edutrack.schoolyear.entity.SchoolYearLock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SchoolYearLockRepository extends JpaRepository<SchoolYearLock, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT l FROM SchoolYearLock l WHERE l.id = 1")
    Optional<SchoolYearLock> acquireActivationLock();
}
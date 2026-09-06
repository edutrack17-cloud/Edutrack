package com.edutrack.schoolyear.repository;

import com.edutrack.schoolyear.entity.SchoolYear;
import com.edutrack.schoolyear.enums.SchoolYearStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SchoolYearRepository extends JpaRepository<SchoolYear, Long>, JpaSpecificationExecutor<SchoolYear> {
    Boolean existsBySchoolYearNameIgnoreCase(String schoolYearName);
    Boolean existsBySchoolYearStatusEquals(SchoolYearStatus schoolYearStatus);
    Optional<SchoolYear> findBySchoolYearStatus(SchoolYearStatus status);
}

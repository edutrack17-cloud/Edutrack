package com.edutrack.schoolyear.repository;

import com.edutrack.schoolyear.entity.SchoolYear;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface SchoolYearRepository extends JpaRepository<SchoolYear, Long>, JpaSpecificationExecutor<SchoolYear> {
    Boolean existsBySchoolYearNameIgnoreCase(String schoolYearName);


}

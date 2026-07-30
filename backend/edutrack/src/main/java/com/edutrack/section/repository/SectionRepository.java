package com.edutrack.section.repository;

import com.edutrack.schoolyear.entity.SchoolYear;
import com.edutrack.section.entity.Section;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface SectionRepository extends JpaRepository<Section, Integer>, JpaSpecificationExecutor<Section> {
    boolean existsBySectionNameIgnoreCase(String sectionName);

    boolean existsBySectionNameAndSchoolYear_SchoolYearId(String sectionName, Long schoolYearId);

    boolean existsBySectionNameAndSchoolYear_SchoolYearIdAndSectionIdNot(
        String sectionName, Long schoolYearId, Integer sectionId);
}

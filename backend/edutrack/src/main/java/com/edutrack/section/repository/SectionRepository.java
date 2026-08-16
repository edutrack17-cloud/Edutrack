package com.edutrack.section.repository;

import com.edutrack.schoolyear.entity.SchoolYear;
import com.edutrack.section.entity.Section;
import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.enums.SectionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SectionRepository extends JpaRepository<Section, Integer>, JpaSpecificationExecutor<Section> {
    boolean existsBySectionNameIgnoreCase(String sectionName);

    boolean existsBySectionNameAndSchoolYear_SchoolYearId(String sectionName, Long schoolYearId);

    boolean existsBySectionNameAndSchoolYear_SchoolYearIdAndSectionIdNot(
            String sectionName, Long schoolYearId, Integer sectionId);

    @EntityGraph(attributePaths = {"user", "schoolYear"})
    @Override
    Page<Section> findAll(Specification<Section> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"user", "schoolYear"})
    @Override
    List<Section> findAll(Specification<Section> spec);

    @EntityGraph(attributePaths = {"user"})
    List<Section> findAllBySchoolYear_SchoolYearId(Long schoolYearId);

    @EntityGraph(attributePaths = {"user"})
    List<Section> findAllBySchoolYear_SchoolYearIdAndGradeLevel(Long schoolYearId, GradeLevel gradeLevel);

    Integer countBySchoolYear(SchoolYear schoolYear);

    Boolean existsBySectionNameAndSchoolYear(String sectionName, SchoolYear schoolYear);
}
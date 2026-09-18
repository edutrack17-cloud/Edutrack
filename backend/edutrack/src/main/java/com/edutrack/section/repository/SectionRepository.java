package com.edutrack.section.repository;

import com.edutrack.schoolyear.entity.SchoolYear;
import com.edutrack.schoolyear.enums.SchoolYearStatus;
import com.edutrack.section.entity.Section;
import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.enums.SectionStatus;
import com.edutrack.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface SectionRepository
        extends JpaRepository<Section, Integer>,
        JpaSpecificationExecutor<Section> {

    boolean existsBySectionNameIgnoreCase(String sectionName);

    boolean existsBySectionNameAndSchoolYear_SchoolYearId(
            String sectionName,
            Long schoolYearId
    );

    boolean existsBySectionNameAndSchoolYear_SchoolYearIdAndSectionIdNot(
            String sectionName,
            Long schoolYearId,
            Integer sectionId
    );

    Optional<Section> findBySectionNameAndSchoolYear_SchoolYearStatus(
            String sectionName,
            SchoolYearStatus schoolYearStatus
    );

    @EntityGraph(attributePaths = {"user", "schoolYear"})
    @Override
    Page<Section> findAll(
            org.springframework.data.jpa.domain.Specification<Section> spec,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"user", "schoolYear"})
    @Override
    List<Section> findAll(
            org.springframework.data.jpa.domain.Specification<Section> spec
    );

    List<Section> findAllByUser_UserId(Long userUserId);

    @EntityGraph(attributePaths = {"user", "schoolYear"})
    List<Section> findAllBySchoolYear_SchoolYearId(Long schoolYearId);

    @EntityGraph(attributePaths = {"user", "schoolYear"})
    List<Section> findAllBySchoolYear_SchoolYearIdAndGradeLevel(
            Long schoolYearId,
            GradeLevel gradeLevel
    );

    Integer countBySchoolYear(SchoolYear schoolYear);

    // FIX: count only sections in a given status (so archived sections don't block cloning)
    long countBySchoolYearAndSectionStatus(
            SchoolYear schoolYear,
            SectionStatus sectionStatus
    );

    Boolean existsByUser(User user);

    Boolean existsBySectionNameAndSchoolYear(
            String sectionName,
            SchoolYear schoolYear
    );

    long countBySectionStatusAndSchoolYear(
            SectionStatus sectionStatus,
            SchoolYear schoolYear
    );

    List<Section> findByUser_UserIdAndSchoolYear(
            Long userId,
            SchoolYear schoolYear
    );

    // SectionRepository
    List<Section> findAllBySchoolYear_SchoolYearIdAndSectionNameIn(
            Long schoolYearId,
            Collection<String> sectionNames
    );
}
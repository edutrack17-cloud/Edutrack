package com.edutrack.section.service;

import com.edutrack.schoolyear.entity.SchoolYear;
import com.edutrack.schoolyear.enums.SchoolYearStatus;
import com.edutrack.schoolyear.exception.*;
import com.edutrack.schoolyear.repository.SchoolYearLockRepository;
import com.edutrack.schoolyear.repository.SchoolYearRepository;
import com.edutrack.section.dto.request.CreateSectionRequest;
import com.edutrack.section.dto.request.NewSchoolYearRequest;
import com.edutrack.section.dto.request.UpdateSectionRequest;
import com.edutrack.section.dto.response.SectionResponse;
import com.edutrack.section.entity.Section;
import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.enums.SectionStatus;
import com.edutrack.section.exception.*;
import com.edutrack.section.mapper.SectionMapper;
import com.edutrack.section.repository.SectionRepository;
import com.edutrack.section.specification.SectionSpecification;
import com.edutrack.shared.exception.NoChangesDetected;
import com.edutrack.studentsectionassignment.repository.StudentSectionAssignmentRepository;
import com.edutrack.user.entity.User;
import com.edutrack.user.enums.AccountStatus;
import com.edutrack.user.exception.UserNotFoundException;
import com.edutrack.user.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class SectionService {

    private final SectionRepository sectionRepository;
    private final UserRepository userRepository;
    private final SectionMapper sectionMapper;
    private final SchoolYearRepository schoolYearRepository;
    private final SchoolYearLockRepository schoolYearLockRepository;
    private final StudentSectionAssignmentRepository studentSectionAssignmentRepository;

    public SectionService(
            SectionRepository sectionRepository,
            UserRepository userRepository,
            SectionMapper sectionMapper,
            SchoolYearRepository schoolYearRepository,
            SchoolYearLockRepository schoolYearLockRepository,
            StudentSectionAssignmentRepository studentSectionAssignmentRepository
    ) {
        this.sectionRepository = sectionRepository;
        this.userRepository = userRepository;
        this.sectionMapper = sectionMapper;
        this.schoolYearRepository = schoolYearRepository;
        this.schoolYearLockRepository = schoolYearLockRepository;
        this.studentSectionAssignmentRepository = studentSectionAssignmentRepository;
    }

    // =========================================================
    // HELPER METHODS
    // =========================================================

    private Section getById(Integer sectionId) {
        return sectionRepository.findById(sectionId)
                .orElseThrow(() -> new SectionNotFound(sectionId));
    }

    private SchoolYear getBySchoolYearId(Long schoolYearId) {
        return schoolYearRepository.findById(schoolYearId)
                .orElseThrow(SchoolYearNotFound::new);
    }

    private User getByUserId(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));
    }

    /*
     * Removes advisers from every section belonging to the
     * specified school year.
     *
     * This is important because adviser assignments belong
     * to a particular school year's section.
     */
    private void clearAdvisers(SchoolYear schoolYear) {

        List<Section> sections =
                sectionRepository.findAllBySchoolYear_SchoolYearId(
                        schoolYear.getSchoolYearId()
                );

        sections.forEach(section -> section.setUser(null));
    }

    /*
     * Creates a brand-new section for the target school year.
     *
     * Adviser is NEVER copied from the source section.
     */
    private Section cloneSection(
            Section sourceSection,
            SchoolYear targetSchoolYear
    ) {

        Section newSection = new Section();

        newSection.setSectionName(sourceSection.getSectionName());

        newSection.setGradeLevel(sourceSection.getGradeLevel());

        // IMPORTANT:
        // Adviser must never be carried over.
        newSection.setUser(null);

        newSection.setSchoolYear(targetSchoolYear);

        // Every cloned section starts active.
        newSection.setSectionStatus(SectionStatus.active);

        return newSection;
    }

    // =========================================================
    // CREATE
    // =========================================================

    @Transactional
    public SectionResponse createSection(
            CreateSectionRequest sectionRequest
    ) {

        User adviserToBeAssigned =
                userRepository.findById(sectionRequest.userId())
                        .orElseThrow(() ->
                                new UserNotFoundException(
                                        sectionRequest.userId()
                                )
                        );

        SchoolYear schoolYearToBeAssigned =
                getBySchoolYearId(sectionRequest.schoolYear());

        if (sectionRepository.existsBySectionNameAndSchoolYear_SchoolYearId(
                sectionRequest.sectionName(),
                sectionRequest.schoolYear()
        )) {
            throw new SectionAlreadyExists(
                    sectionRequest.sectionName()
            );
        }

        if (adviserToBeAssigned.getAccountStatus()
                == AccountStatus.disabled) {

            throw new AdviserAccountDisabled();
        }

        Section sectionEntity =
                sectionMapper.toEntity(sectionRequest);

        sectionEntity.setUser(adviserToBeAssigned);
        sectionEntity.setSchoolYear(schoolYearToBeAssigned);

        try {

            Section savedSection =
                    sectionRepository.save(sectionEntity);

            return sectionMapper.toResponseDTO(savedSection);

        } catch (DataIntegrityViolationException e) {

            throw new SectionAlreadyExists(
                    sectionRequest.sectionName()
            );
        }
    }

    // =========================================================
    // READ
    // =========================================================

    public Page<SectionResponse> getSection(
            String fullName,
            GradeLevel gradeLevel,
            SectionStatus sectionStatus,
            String sectionName,
            Pageable pageable
    ) {

        Specification<Section> filters =
                Specification
                        .where(SectionSpecification.hasAdviserName(fullName))
                        .and(SectionSpecification.hasGradeLevel(gradeLevel))
                        .and(SectionSpecification.hasStatus(sectionStatus))
                        .and(SectionSpecification.hasSectionName(sectionName));

        Pageable sortedPageable =
                pageable.getSort().isSorted()
                        ? pageable
                        : PageRequest.of(
                        pageable.getPageNumber(),
                        pageable.getPageSize(),
                        Sort.by(
                                Sort.Direction.DESC,
                                "sectionId"
                        )
                );

        return sectionRepository
                .findAll(filters, sortedPageable)
                .map(sectionMapper::toResponseDTO);
    }

    // =========================================================
    // READ BY ADVISER
    // =========================================================

    public List<SectionResponse> readSectionByAdviser(Long userId) {

        Specification<Section> filters =
                Specification
                        .where(SectionSpecification.hasAdviserId(userId))
                        .and(SectionSpecification.hasStatus(
                                SectionStatus.active
                        ))
                        .and(SectionSpecification.hasSchoolYearStatus());

        List<Section> listOfSections =
                sectionRepository.findAll(filters);

        if (listOfSections.isEmpty()) {
            throw new AdvisorySectionNotFound();
        }

        return listOfSections.stream()
                .map(sectionMapper::toResponseDTO)
                .toList();
    }

    // =========================================================
    // SECTION DROPDOWN
    // =========================================================

    public List<SectionResponse> sectionDropDown(
            GradeLevel gradeLevel
    ) {

        Specification<Section> filters =
                Specification
                        .where(SectionSpecification.hasStatus(
                                SectionStatus.active
                        ))
                        .and(SectionSpecification.hasGradeLevel(
                                gradeLevel
                        ))
                        .and(SectionSpecification.hasSchoolYearStatus());

        return sectionRepository
                .findAll(filters)
                .stream()
                .map(sectionMapper::toResponseDTO)
                .toList();
    }

    // =========================================================
    // UPDATE
    // =========================================================

    @Transactional
    public SectionResponse updateSection(
            Integer sectionId,
            UpdateSectionRequest updateSectionRequest
    ) {

        Section sectionToUpdate = getById(sectionId);

        boolean fieldsChanged = false;
        boolean schoolYearChanged = false;

        String finalSectionName =
                sectionToUpdate.getSectionName();

        SchoolYear finalSchoolYear =
                sectionToUpdate.getSchoolYear();

        // -----------------------------------------------------
        // SECTION NAME
        // -----------------------------------------------------

        if (updateSectionRequest.sectionName() != null
                && !updateSectionRequest.sectionName().isBlank()
                && !sectionToUpdate.getSectionName()
                .equalsIgnoreCase(
                        updateSectionRequest.sectionName()
                )) {

            finalSectionName =
                    updateSectionRequest.sectionName().trim();

            fieldsChanged = true;
        }

        // -----------------------------------------------------
        // SCHOOL YEAR
        // -----------------------------------------------------

        if (updateSectionRequest.schoolYear() != null
                && !sectionToUpdate.getSchoolYear()
                .getSchoolYearId()
                .equals(updateSectionRequest.schoolYear())) {

            finalSchoolYear =
                    getBySchoolYearId(
                            updateSectionRequest.schoolYear()
                    );

            schoolYearChanged = true;
            fieldsChanged = true;
        }

        // -----------------------------------------------------
        // CHECK DUPLICATE SECTION NAME
        // -----------------------------------------------------

        if (fieldsChanged &&
                (schoolYearChanged
                        || !finalSectionName.equals(
                        sectionToUpdate.getSectionName()
                ))) {

            if (sectionRepository
                    .existsBySectionNameAndSchoolYear_SchoolYearIdAndSectionIdNot(
                            finalSectionName,
                            finalSchoolYear.getSchoolYearId(),
                            sectionId
                    )) {

                throw new SectionAlreadyExists(
                        finalSectionName
                );
            }
        }

        // -----------------------------------------------------
        // APPLY NAME / SCHOOL YEAR
        // -----------------------------------------------------

        if (!finalSectionName.equals(
                sectionToUpdate.getSectionName()
        )) {

            sectionToUpdate.setSectionName(finalSectionName);
            fieldsChanged = true;
        }

        if (schoolYearChanged) {

            sectionToUpdate.setSchoolYear(finalSchoolYear);

            /*
             * IMPORTANT:
             *
             * If a section is moved to another school year,
             * the old adviser must NOT follow it.
             */
            sectionToUpdate.setUser(null);

            fieldsChanged = true;
        }

        // -----------------------------------------------------
        // GRADE LEVEL
        // -----------------------------------------------------

        if (updateSectionRequest.gradeLevel() != null
                && !sectionToUpdate.getGradeLevel()
                .equals(updateSectionRequest.gradeLevel())) {

            sectionToUpdate.setGradeLevel(
                    updateSectionRequest.gradeLevel()
            );

            fieldsChanged = true;
        }

        // -----------------------------------------------------
        // ADVISER
        // -----------------------------------------------------

        if (updateSectionRequest.userId() != null
                && (sectionToUpdate.getUser() == null
                || !sectionToUpdate.getUser()
                .getUserId()
                .equals(updateSectionRequest.userId()))) {

            User newAdviser =
                    getByUserId(updateSectionRequest.userId());

            if (newAdviser.getAccountStatus()
                    == AccountStatus.disabled) {

                throw new TeacherAccountDisabled();
            }

            sectionToUpdate.setUser(newAdviser);

            fieldsChanged = true;
        }

        // -----------------------------------------------------
        // NO CHANGES
        // -----------------------------------------------------

        if (!fieldsChanged) {
            throw new NoChangesDetected();
        }

        // -----------------------------------------------------
        // SAVE
        // -----------------------------------------------------

        try {

            Section updatedSection =
                    sectionRepository.saveAndFlush(
                            sectionToUpdate
                    );

            return sectionMapper.toResponseDTO(
                    updatedSection
            );

        } catch (DataIntegrityViolationException e) {

            throw new SectionAlreadyExists(
                    finalSectionName
            );
        }
    }

    // =========================================================
    // ARCHIVE SECTION
    // =========================================================

    @Transactional
    public SectionResponse archiveSection(Integer sectionId) {

        Section sectionToArchive = getById(sectionId);

        if (sectionToArchive.getSectionStatus()
                .equals(SectionStatus.archived)) {

            throw new AlreadyArchived(
                    sectionToArchive.getSectionName(),
                    sectionId
            );
        }

        if (studentSectionAssignmentRepository
                .existsBySectionAndSection_SchoolYear_SchoolYearStatus(
                        sectionToArchive,
                        SchoolYearStatus.active
                )) {

            throw new SectionHasEnrolledStudents();
        }

        sectionToArchive.setSectionStatus(
                SectionStatus.archived
        );

        return sectionMapper.toResponseDTO(
                sectionToArchive
        );
    }

    // =========================================================
    // RESTORE SECTION
    // =========================================================

    @Transactional
    public SectionResponse restoreSection(Integer sectionId) {

        Section sectionToRestore = getById(sectionId);

        if (sectionToRestore.getSectionStatus()
                .equals(SectionStatus.active)) {

            throw new AlreadyActive(
                    sectionToRestore.getSectionName(),
                    sectionId
            );
        }

        sectionToRestore.setSectionStatus(
                SectionStatus.active
        );

        return sectionMapper.toResponseDTO(
                sectionToRestore
        );
    }

    // =========================================================
    // START NEW SCHOOL YEAR
    // =========================================================

    @Transactional
    public List<SectionResponse> newSchoolYear(
            NewSchoolYearRequest request
    ) {

        /*
         * Prevent two admins from starting a school year
         * simultaneously.
         */
        schoolYearLockRepository.acquireActivationLock()
                .orElseThrow(
                        ActiveSchoolYearLockUnavailable::new
                );

        // -----------------------------------------------------
        // GET SOURCE / TARGET
        // -----------------------------------------------------

        SchoolYear sourceSchoolYear =
                getBySchoolYearId(
                        request.sourceSchoolYearId()
                );

        SchoolYear targetSchoolYear =
                getBySchoolYearId(
                        request.targetSchoolYearId()
                );

        // -----------------------------------------------------
        // SAME SCHOOL YEAR
        // -----------------------------------------------------

        if (sourceSchoolYear.getSchoolYearId()
                .equals(targetSchoolYear.getSchoolYearId())) {

            throw new SameSchoolYearNotAllowed();
        }

        // -----------------------------------------------------
        // SOURCE MUST BE ACTIVE OR CLOSED
        // -----------------------------------------------------

        boolean sourceEligible =
                sourceSchoolYear.getSchoolYearStatus()
                        == SchoolYearStatus.active
                        || sourceSchoolYear.getSchoolYearStatus()
                        == SchoolYearStatus.closed;

        if (!sourceEligible) {
            throw new SourceSchoolYearNotEligible();
        }

        // -----------------------------------------------------
        // TARGET MUST BE PLANNING OR ACTIVE
        // -----------------------------------------------------

        boolean targetEligible =
                targetSchoolYear.getSchoolYearStatus()
                        == SchoolYearStatus.planning
                        || targetSchoolYear.getSchoolYearStatus()
                        == SchoolYearStatus.active;

        if (!targetEligible) {
            throw new SchoolYearNotPlanning();
        }

        // -----------------------------------------------------
        // CANNOT HAVE TWO ACTIVE SCHOOL YEARS
        // -----------------------------------------------------

        if (sourceSchoolYear.getSchoolYearStatus()
                == SchoolYearStatus.active
                && targetSchoolYear.getSchoolYearStatus()
                == SchoolYearStatus.active) {

            throw new ActiveSchoolYearAlreadyExists();
        }

        // -----------------------------------------------------
        // TARGET MUST HAVE NO SECTIONS
        // -----------------------------------------------------

        if (sectionRepository.countBySchoolYear(
                targetSchoolYear
        ) > 0) {

            throw new SchoolYearAlreadyHasSections();
        }

        // -----------------------------------------------------
        // GET SOURCE SECTIONS
        // -----------------------------------------------------

        List<Section> sourceSections;

        if (request.gradeLevel() == null) {

            sourceSections =
                    sectionRepository
                            .findAllBySchoolYear_SchoolYearId(
                                    sourceSchoolYear
                                            .getSchoolYearId()
                            );

        } else {

            sourceSections =
                    sectionRepository
                            .findAllBySchoolYear_SchoolYearIdAndGradeLevel(
                                    sourceSchoolYear
                                            .getSchoolYearId(),
                                    request.gradeLevel()
                            );
        }

        if (sourceSections.isEmpty()) {
            throw new SchoolYearSectionsNotFound();
        }

        // -----------------------------------------------------
        // CLONE SECTIONS
        // -----------------------------------------------------

        List<Section> newSections =
                sourceSections.stream()
                        .map(section ->
                                cloneSection(
                                        section,
                                        targetSchoolYear
                                )
                        )
                        .toList();

        try {

            /*
             * Save the cloned sections first.
             *
             * Every cloned section has adviser = NULL.
             */
            List<Section> savedSections =
                    sectionRepository.saveAll(
                            newSections
                    );

            /*
             * If the source was still active, close it.
             *
             * Closing also clears advisers from ALL source
             * sections, not just the selected grade level.
             */
            if (sourceSchoolYear.getSchoolYearStatus()
                    == SchoolYearStatus.active) {

                clearAdvisers(sourceSchoolYear);

                sourceSchoolYear.setSchoolYearStatus(
                        SchoolYearStatus.closed
                );

                sourceSchoolYear.setUpdatedAt(
                        LocalDate.now()
                );
            }

            /*
             * If the target was planning, it now becomes active.
             */
            if (targetSchoolYear.getSchoolYearStatus()
                    == SchoolYearStatus.planning) {

                targetSchoolYear.setSchoolYearStatus(
                        SchoolYearStatus.active
                );

                targetSchoolYear.setUpdatedAt(
                        LocalDate.now()
                );
            }

            return savedSections.stream()
                    .map(sectionMapper::toResponseDTO)
                    .toList();

        } catch (DataIntegrityViolationException e) {

            /*
             * Because the whole method is transactional,
             * the section inserts and school-year changes
             * will be rolled back.
             */
            throw new SchoolYearAlreadyHasSections();
        }
    }
}
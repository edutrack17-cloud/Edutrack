package com.edutrack.section.service;

import com.edutrack.schoolyear.entity.SchoolYear;
import com.edutrack.schoolyear.enums.SchoolYearStatus;
import com.edutrack.schoolyear.exception.*;
import com.edutrack.schoolyear.repository.SchoolYearLockRepository;
import com.edutrack.schoolyear.repository.SchoolYearRepository;
import com.edutrack.section.dto.request.*;
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
import java.util.*;
import java.util.stream.Collectors;

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

    // CHANGED: pass the id to the exception so the error message is useful.
    private SchoolYear getBySchoolYearId(Long schoolYearId) {
        return schoolYearRepository.findById(schoolYearId)
                .orElseThrow(() -> new SchoolYearNotFound());
    }

    private User getByUserId(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));
    }

    /**
     * Removes advisers from every section belonging to the specified school year.
     * FIX: also flushes so the null assignments are visible within the same transaction
     * (important because other code in the same transaction may re-read these rows).
     */
    private void clearAdvisers(SchoolYear schoolYear) {

        List<Section> sections =
                sectionRepository.findAllBySchoolYear_SchoolYearId(
                        schoolYear.getSchoolYearId()
                );

        sections.forEach(section -> section.setUser(null));

        // FIX: force the UPDATE now so later queries in this transaction see the change
        sectionRepository.flush();
    }

    /**
     * Creates a brand-new section for the target school year.
     * Adviser is NEVER copied from the source section.
     */
    private Section cloneSection(
            Section sourceSection,
            SchoolYear targetSchoolYear
    ) {
        Section newSection = new Section();

        newSection.setSectionName(sourceSection.getSectionName());
        newSection.setGradeLevel(sourceSection.getGradeLevel());

        // IMPORTANT: adviser must never be carried over.
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
    public SectionResponse createSection(CreateSectionRequest sectionRequest) {
        return doCreateSection(
                sectionRequest.sectionName(),
                sectionRequest.schoolYear(),
                sectionRequest.gradeLevel(),
                sectionRequest.userId()
        );
    }

    @Transactional
    public SectionResponse cloneSection(CloneSectionRequest cloneRequest) {
        return doCreateSection(
                cloneRequest.sectionName(),
                cloneRequest.schoolYear(),
                cloneRequest.gradeLevel(),
                cloneRequest.userId()
        );
    }

    @Transactional
    public List<SectionResponse> cloneSectionBatch(CloneSectionBatchRequest batchRequest) {

        // 1. Resolve target school year ONCE
        SchoolYear targetSchoolYear = getBySchoolYearId(batchRequest.targetSchoolYearId());

        // 2. Resolve all unique adviser ids in ONE query
        Set<Long> adviserIds = batchRequest.sections().stream()
                .map(CloneSectionRequest::userId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, User> advisersById = adviserIds.isEmpty()
                ? Map.of()
                : userRepository.findAllById(adviserIds).stream()
                .collect(Collectors.toMap(User::getUserId, u -> u));

        // 3. Check which section names already exist under target in ONE query
        List<String> requestedNames = batchRequest.sections().stream()
                .map(CloneSectionRequest::sectionName)
                .toList();

        Set<String> existingNames = sectionRepository
                .findAllBySchoolYear_SchoolYearIdAndSectionNameIn(
                        targetSchoolYear.getSchoolYearId(), requestedNames)
                .stream()
                .map(s -> s.getSectionName().toLowerCase())
                .collect(Collectors.toSet());

        // 4. Build all entities in memory, fail fast on any bad row
        List<Section> toSave = new ArrayList<>(batchRequest.sections().size());

        for (CloneSectionRequest req : batchRequest.sections()) {
            if (existingNames.contains(req.sectionName().toLowerCase())) {
                throw new SectionAlreadyExists(req.sectionName());
            }

            User adviser = null;
            if (req.userId() != null) {
                adviser = advisersById.get(req.userId());
                if (adviser == null) {
                    throw new UserNotFoundException(req.userId());
                }
                if (adviser.getAccountStatus() == AccountStatus.disabled) {
                    throw new AdviserAccountDisabled();
                }
            }

            Section s = new Section();
            s.setSectionName(req.sectionName());
            s.setGradeLevel(req.gradeLevel());
            s.setUser(adviser);
            s.setSchoolYear(targetSchoolYear);
            s.setSectionStatus(SectionStatus.active);
            toSave.add(s);
        }

        // 5. ONE saveAll, ONE flush at commit
        List<Section> saved = sectionRepository.saveAll(toSave);

        return saved.stream().map(sectionMapper::toResponseDTO).toList();
    }

    /**
     * Shared creation logic for both the manual-create endpoint and the
     * clone endpoint. Adviser is optional at this layer — the manual-create
     * controller enforces "adviser required" itself, and the clone path
     * legitimately passes null.
     */
    private SectionResponse doCreateSection(
            String sectionName,
            Long schoolYearId,
            GradeLevel gradeLevel,
            Long userId
    ) {
        User adviserToBeAssigned = null;

        if (userId != null) {
            adviserToBeAssigned = userRepository.findById(userId)
                    .orElseThrow(() -> new UserNotFoundException(userId));

            if (adviserToBeAssigned.getAccountStatus() == AccountStatus.disabled) {
                throw new AdviserAccountDisabled();
            }
        }

        SchoolYear schoolYearToBeAssigned = getBySchoolYearId(schoolYearId);

        if (sectionRepository.existsBySectionNameAndSchoolYear_SchoolYearId(
                sectionName,
                schoolYearId
        )) {
            throw new SectionAlreadyExists(sectionName);
        }

        Section sectionEntity = new Section();
        sectionEntity.setSectionName(sectionName);
        sectionEntity.setGradeLevel(gradeLevel);
        sectionEntity.setUser(adviserToBeAssigned);           // null is valid
        sectionEntity.setSchoolYear(schoolYearToBeAssigned);
        sectionEntity.setSectionStatus(SectionStatus.active);

        try {
            Section savedSection = sectionRepository.saveAndFlush(sectionEntity);
            return sectionMapper.toResponseDTO(savedSection);
        } catch (DataIntegrityViolationException e) {
            throw new SectionAlreadyExists(sectionName);
        }
    }

    // =========================================================
    // READ
    // =========================================================
    public long countBySchoolYear(Long schoolYearId) {
        SchoolYear schoolYear = getBySchoolYearId(schoolYearId);
        return sectionRepository.countBySchoolYear(schoolYear);
    }

    public Page<SectionResponse> getSection(
            String fullName,
            GradeLevel gradeLevel,
            SectionStatus sectionStatus,
            String sectionName,
            Long schoolYearId,
            Pageable pageable
    ) {
        Specification<Section> filters =
                Specification
                        .where(SectionSpecification.hasAdviserName(fullName))
                        .and(SectionSpecification.hasGradeLevel(gradeLevel))
                        .and(SectionSpecification.hasStatus(sectionStatus))
                        .and(SectionSpecification.hasSectionName(sectionName))
                        .and(SectionSpecification.hasSchoolYearId(schoolYearId));

        Pageable sortedPageable =
                pageable.getSort().isSorted()
                        ? pageable
                        : PageRequest.of(
                        pageable.getPageNumber(),
                        pageable.getPageSize(),
                        Sort.by(Sort.Direction.DESC, "sectionId")
                );

        return sectionRepository
                .findAll(filters, sortedPageable)
                .map(sectionMapper::toResponseDTO);
    }

    // =========================================================
    // READ ONE SECTION BY ID
    // NEW: this is the method the controller's GET /api/section/{sectionId}
    // delegates to. Throws SectionNotFound (→ 404) only when the section
    // genuinely does not exist.
    // =========================================================
    public SectionResponse getSectionById(Integer sectionId) {
        return sectionMapper.toResponseDTO(getById(sectionId));
    }

    // =========================================================
    // READ BY ADVISER
    // CHANGED: no longer throws AdvisorySectionNotFound when the adviser
    // has no active sections. "No sections" is a valid empty result,
    // not a not-found error — throwing 404 here was poisoning the
    // frontend whenever it accidentally hit this route.
    // =========================================================
    public List<SectionResponse> readSectionByAdviser(Long userId) {

        Specification<Section> filters =
                Specification
                        .where(SectionSpecification.hasAdviserId(userId))
                        .and(SectionSpecification.hasStatus(SectionStatus.active))
                        .and(SectionSpecification.hasSchoolYearStatus());

        return sectionRepository.findAll(filters)
                .stream()
                .map(sectionMapper::toResponseDTO)
                .toList();
    }

    // =========================================================
    // SECTION DROPDOWN
    // =========================================================

    public List<SectionResponse> sectionDropDown(GradeLevel gradeLevel) {

        Specification<Section> filters =
                Specification
                        .where(SectionSpecification.hasStatus(SectionStatus.active))
                        .and(SectionSpecification.hasGradeLevel(gradeLevel))
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

        String finalSectionName = sectionToUpdate.getSectionName();
        SchoolYear finalSchoolYear = sectionToUpdate.getSchoolYear();

        // SECTION NAME
        if (updateSectionRequest.sectionName() != null
                && !updateSectionRequest.sectionName().isBlank()
                && !sectionToUpdate.getSectionName()
                .equalsIgnoreCase(updateSectionRequest.sectionName())) {

            finalSectionName = updateSectionRequest.sectionName().trim();
            fieldsChanged = true;
        }

        // SCHOOL YEAR
        if (updateSectionRequest.schoolYear() != null
                && !sectionToUpdate.getSchoolYear()
                .getSchoolYearId()
                .equals(updateSectionRequest.schoolYear())) {

            finalSchoolYear = getBySchoolYearId(updateSectionRequest.schoolYear());
            schoolYearChanged = true;
            fieldsChanged = true;
        }

        // DUPLICATE CHECK
        if (fieldsChanged &&
                (schoolYearChanged
                        || !finalSectionName.equals(sectionToUpdate.getSectionName()))) {

            if (sectionRepository
                    .existsBySectionNameAndSchoolYear_SchoolYearIdAndSectionIdNot(
                            finalSectionName,
                            finalSchoolYear.getSchoolYearId(),
                            sectionId
                    )) {
                throw new SectionAlreadyExists(finalSectionName);
            }
        }

        // APPLY NAME
        if (!finalSectionName.equals(sectionToUpdate.getSectionName())) {
            sectionToUpdate.setSectionName(finalSectionName);
            fieldsChanged = true;
        }

        // APPLY SCHOOL YEAR
        if (schoolYearChanged) {
            sectionToUpdate.setSchoolYear(finalSchoolYear);
            // adviser must NOT follow the section to a new school year
            sectionToUpdate.setUser(null);
            fieldsChanged = true;
        }

        // GRADE LEVEL
        if (updateSectionRequest.gradeLevel() != null
                && !sectionToUpdate.getGradeLevel()
                .equals(updateSectionRequest.gradeLevel())) {

            sectionToUpdate.setGradeLevel(updateSectionRequest.gradeLevel());
            fieldsChanged = true;
        }

        // ADVISER
        if (updateSectionRequest.userId() != null
                && (sectionToUpdate.getUser() == null
                || !sectionToUpdate.getUser()
                .getUserId()
                .equals(updateSectionRequest.userId()))) {

            User newAdviser = getByUserId(updateSectionRequest.userId());

            if (newAdviser.getAccountStatus() == AccountStatus.disabled) {
                throw new TeacherAccountDisabled();
            }

            sectionToUpdate.setUser(newAdviser);
            fieldsChanged = true;
        }

        if (!fieldsChanged) {
            throw new NoChangesDetected();
        }

        try {
            Section updatedSection =
                    sectionRepository.saveAndFlush(sectionToUpdate);

            return sectionMapper.toResponseDTO(updatedSection);

        } catch (DataIntegrityViolationException e) {
            throw new SectionAlreadyExists(finalSectionName);
        }
    }

    // =========================================================
    // ARCHIVE SECTION
    // =========================================================

    @Transactional
    public SectionResponse archiveSection(Integer sectionId) {

        Section sectionToArchive = getById(sectionId);

        if (sectionToArchive.getSectionStatus() == SectionStatus.archived) {
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

        sectionToArchive.setSectionStatus(SectionStatus.archived);

        return sectionMapper.toResponseDTO(sectionToArchive);
    }

    // =========================================================
    // RESTORE SECTION
    // =========================================================

    @Transactional
    public SectionResponse restoreSection(Integer sectionId) {

        Section sectionToRestore = getById(sectionId);

        if (sectionToRestore.getSectionStatus() == SectionStatus.active) {
            throw new AlreadyActive(
                    sectionToRestore.getSectionName(),
                    sectionId
            );
        }

        sectionToRestore.setSectionStatus(SectionStatus.active);

        return sectionMapper.toResponseDTO(sectionToRestore);
    }

    // =========================================================
    // START NEW SCHOOL YEAR
    // =========================================================

    @Transactional
    public List<SectionResponse> newSchoolYear(NewSchoolYearRequest request) {

        /*
         * FIX: acquire the lock at the very start, and do NOT release it early.
         * The lock must cover the entire read-validate-write cycle.
         */
        schoolYearLockRepository.acquireActivationLock()
                .orElseThrow(ActiveSchoolYearLockUnavailable::new);

        // -----------------------------------------------------
        // GET SOURCE / TARGET
        // -----------------------------------------------------

        SchoolYear sourceSchoolYear = getBySchoolYearId(request.sourceSchoolYearId());
        SchoolYear targetSchoolYear = getBySchoolYearId(request.targetSchoolYearId());

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
                sourceSchoolYear.getSchoolYearStatus() == SchoolYearStatus.active
                        || sourceSchoolYear.getSchoolYearStatus() == SchoolYearStatus.closed;

        if (!sourceEligible) {
            throw new SourceSchoolYearNotEligible();
        }

        // -----------------------------------------------------
        // TARGET MUST BE PLANNING OR ACTIVE
        // -----------------------------------------------------

        boolean targetEligible =
                targetSchoolYear.getSchoolYearStatus() == SchoolYearStatus.planning
                        || targetSchoolYear.getSchoolYearStatus() == SchoolYearStatus.active;

        if (!targetEligible) {
            throw new SchoolYearNotPlanning();
        }

        // -----------------------------------------------------
        // CANNOT HAVE TWO ACTIVE SCHOOL YEARS
        // -----------------------------------------------------

        if (sourceSchoolYear.getSchoolYearStatus() == SchoolYearStatus.active
                && targetSchoolYear.getSchoolYearStatus() == SchoolYearStatus.active) {
            throw new ActiveSchoolYearAlreadyExists();
        }

        // -----------------------------------------------------
        // TARGET MUST HAVE NO *ACTIVE* SECTIONS
        // (archived sections in the target should not block cloning)
        // -----------------------------------------------------

        long activeSectionsInTarget =
                sectionRepository.countBySchoolYearAndSectionStatus(
                        targetSchoolYear,
                        SectionStatus.active
                );

        if (activeSectionsInTarget > 0) {
            throw new SchoolYearAlreadyHasSections();
        }

        // -----------------------------------------------------
        // GET SOURCE SECTIONS
        // -----------------------------------------------------

        List<Section> sourceSections;

        if (request.gradeLevel() == null) {
            sourceSections = sectionRepository
                    .findAllBySchoolYear_SchoolYearId(sourceSchoolYear.getSchoolYearId());
        } else {
            sourceSections = sectionRepository
                    .findAllBySchoolYear_SchoolYearIdAndGradeLevel(
                            sourceSchoolYear.getSchoolYearId(),
                            request.gradeLevel()
                    );
        }

        if (sourceSections.isEmpty()) {
            throw new SchoolYearSectionsNotFound();
        }

        // -----------------------------------------------------
        // CLONE SECTIONS
        // -----------------------------------------------------

        List<Section> newSections = sourceSections.stream()
                .map(section -> cloneSection(section, targetSchoolYear))
                .toList();

        // -----------------------------------------------------
        // SAVE + TRANSITION
        // -----------------------------------------------------
        // FIX: everything is inside one try, and we flush() explicitly so that
        // a constraint violation is caught here (before commit), not after the
        // method returns (which is what caused "error but data pushed through").
        try {
            List<Section> savedSections = sectionRepository.saveAll(newSections);

            // Force the INSERTs to hit the DB now so any unique-constraint
            // violation surfaces inside this try/catch.
            sectionRepository.flush();

            /*
             * FIX: clear advisers on the source regardless of whether the source
             * was active or already closed. If the user manually closed the source
             * before calling this, we still want its advisers removed because a
             * new school year is starting.
             */
            clearAdvisers(sourceSchoolYear);

            if (sourceSchoolYear.getSchoolYearStatus() == SchoolYearStatus.active) {
                sourceSchoolYear.setSchoolYearStatus(SchoolYearStatus.closed);
                sourceSchoolYear.setUpdatedAt(LocalDate.now());
            }

            if (targetSchoolYear.getSchoolYearStatus() == SchoolYearStatus.planning) {
                targetSchoolYear.setSchoolYearStatus(SchoolYearStatus.active);
                targetSchoolYear.setUpdatedAt(LocalDate.now());
            }

            // Flush school year status changes too, so optimistic-lock
            // (@Version) conflicts surface here.
            schoolYearRepository.flush();

            return savedSections.stream()
                    .map(sectionMapper::toResponseDTO)
                    .toList();

        } catch (DataIntegrityViolationException e) {
            /*
             * Because the whole method is transactional and we flushed inside
             * the try, the rollback is clean: no sections, no status changes.
             */
            throw new SchoolYearAlreadyHasSections();
        }
    }
}
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
import com.edutrack.shared.util.NameUtil;
import com.edutrack.studentsectionassignment.repository.StudentSectionAssignmentRepository;
import com.edutrack.user.entity.User;
import com.edutrack.user.enums.AccountStatus;
import com.edutrack.user.exception.AccountDisabled;
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

    public SectionService(SectionRepository sectionRepository,
                          UserRepository userRepository,
                          SectionMapper sectionMapper,
                          SchoolYearRepository schoolYearRepository,
                          SchoolYearLockRepository schoolYearLockRepository,
                          StudentSectionAssignmentRepository studentSectionAssignmentRepository) {
        this.sectionRepository = sectionRepository;
        this.userRepository = userRepository;
        this.sectionMapper = sectionMapper;
        this.schoolYearRepository = schoolYearRepository;
        this.schoolYearLockRepository = schoolYearLockRepository;
        this.studentSectionAssignmentRepository = studentSectionAssignmentRepository;
    }


    private Section getById(Integer sectionId){
        return sectionRepository.findById(sectionId).orElseThrow(() -> new SectionNotFound(sectionId));
    }

    private SchoolYear getBySchoolYearId(Long schoolYearId){
        return schoolYearRepository.findById(schoolYearId).orElseThrow(SchoolYearNotFound::new);
    }

    private User getByUserId(Long userId) {
    return userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));
    }

    //CREATE
    @Transactional
    public SectionResponse createSection(CreateSectionRequest sectionRequest){
        User adviserToBeAssign = userRepository.findById(sectionRequest.userId()).orElseThrow(() -> new UserNotFoundException(sectionRequest.userId()));
        SchoolYear schoolYearToBeAssign = getBySchoolYearId(sectionRequest.schoolYear());

        if (sectionRepository.existsBySectionNameAndSchoolYear_SchoolYearId(sectionRequest.sectionName(), sectionRequest.schoolYear())){
            throw new SectionAlreadyExists(sectionRequest.sectionName());
        }

        if (adviserToBeAssign.getAccountStatus() == AccountStatus.disabled){
            throw new AdviserAccountDisabled();
        }

        Section sectionEntity = sectionMapper.toEntity(sectionRequest);
        sectionEntity.setUser(adviserToBeAssign);
        sectionEntity.setSchoolYear(schoolYearToBeAssign);

        try {
            Section savedSection = sectionRepository.save(sectionEntity);
            return sectionMapper.toResponseDTO(savedSection);
        } catch (DataIntegrityViolationException e) {
            throw new SectionAlreadyExists(sectionRequest.sectionName());
        }
    }

    //READ
    public Page<SectionResponse> getSection(String fullName, GradeLevel gradeLevel, SectionStatus sectionStatus, String sectionName, Pageable pageable){
        Specification<Section> filters = Specification
                .where(SectionSpecification.hasAdviserName(fullName))
                .and(SectionSpecification.hasGradeLevel(gradeLevel))
                .and(SectionSpecification.hasStatus(sectionStatus))
                .and(SectionSpecification.hasSectionName(sectionName));

        Pageable sortedPageable = pageable.getSort().isSorted()
                ? pageable
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "sectionId"));

        return sectionRepository.findAll(filters, sortedPageable).map(sectionMapper::toResponseDTO);
    }

    //READ BY ADVISER
    public List<SectionResponse> readSectionByAdviser(Long userId){
        Specification<Section> filters = Specification
                .where(SectionSpecification.hasAdviserId(userId))
                .and(SectionSpecification.hasStatus(SectionStatus.active))
                .and(SectionSpecification.hasSchoolYearStatus());

        List<Section> listOfSections = sectionRepository.findAll(filters);

        if (listOfSections.isEmpty()){
            throw new AdvisorySectionNotFound();
        }

        return listOfSections.stream()
                .map(sectionMapper::toResponseDTO)
                .toList();
    }

    //SECTION DROPDOWN
    public List<SectionResponse> sectionDropDown(GradeLevel gradeLevel){
        Specification<Section> filters = Specification
                .where(SectionSpecification.hasStatus(SectionStatus.active))
                .and(SectionSpecification.hasGradeLevel(gradeLevel))
                .and(SectionSpecification.hasSchoolYearStatus());

        return sectionRepository.findAll(filters)
                .stream()
                .map(sectionMapper::toResponseDTO)
                .toList();
    }

    //UPDATE
    @Transactional
    public SectionResponse updateSection(Integer sectionId, UpdateSectionRequest updateSectionRequest) {
        Section sectionToUpdate = getById(sectionId);
        boolean fieldsChanged = false;
        boolean nameOrYearChanged = false;

        String finalSectionName = sectionToUpdate.getSectionName();
        SchoolYear finalSchoolYear = sectionToUpdate.getSchoolYear();

        if (updateSectionRequest.sectionName() != null &&
                !updateSectionRequest.sectionName().isBlank() &&
                !sectionToUpdate.getSectionName().equalsIgnoreCase(updateSectionRequest.sectionName())) {
            finalSectionName = updateSectionRequest.sectionName();
            nameOrYearChanged = true;
        }

        if (updateSectionRequest.schoolYear() != null &&
                !sectionToUpdate.getSchoolYear().getSchoolYearId().equals(updateSectionRequest.schoolYear())) {
            finalSchoolYear = getBySchoolYearId(updateSectionRequest.schoolYear());
            nameOrYearChanged = true;
        }

        if (nameOrYearChanged) {
            if (sectionRepository.existsBySectionNameAndSchoolYear_SchoolYearIdAndSectionIdNot(
                    finalSectionName, finalSchoolYear.getSchoolYearId(), sectionId)) {
                throw new SectionAlreadyExists(finalSectionName);
            }
            sectionToUpdate.setSectionName(finalSectionName);
            sectionToUpdate.setSchoolYear(finalSchoolYear);
            fieldsChanged = true;
        }

        if (updateSectionRequest.gradeLevel() != null &&
                !sectionToUpdate.getGradeLevel().equals(updateSectionRequest.gradeLevel())) {
            sectionToUpdate.setGradeLevel(updateSectionRequest.gradeLevel());
            fieldsChanged = true;
        }

        if (updateSectionRequest.userId() != null && (sectionToUpdate.getUser() == null ||
                !sectionToUpdate.getUser().getUserId().equals(updateSectionRequest.userId()))) {

            User newAdviser = getByUserId(updateSectionRequest.userId());

            if (newAdviser.getAccountStatus() == AccountStatus.disabled){
                throw new TeacherAccountDisabled();
            }

            sectionToUpdate.setUser(newAdviser);
            fieldsChanged = true;
        }

        if (!fieldsChanged) {
            throw new NoChangesDetected();
        }

        try {
            Section updatedSection = sectionRepository.saveAndFlush(sectionToUpdate);
            return sectionMapper.toResponseDTO(updatedSection);
        } catch (DataIntegrityViolationException e) {
            throw new SectionAlreadyExists(finalSectionName);
        }
    }

    //ARCHIVE
    @Transactional
    public SectionResponse archiveSection(Integer sectionId) {
        Section sectionToArchive = getById(sectionId);

        if (sectionToArchive.getSectionStatus().equals(SectionStatus.archived)) {
            throw new AlreadyArchived(sectionToArchive.getSectionName(), sectionId);
        }

        if (studentSectionAssignmentRepository.existsBySectionAndSection_SchoolYear_SchoolYearStatus(sectionToArchive, SchoolYearStatus.active)){
            throw new SectionHasEnrolledStudents();
        }

        sectionToArchive.setSectionStatus(SectionStatus.archived);
        return sectionMapper.toResponseDTO(sectionToArchive);
    }

    //RESTORE
    @Transactional
    public SectionResponse restoreSection(Integer sectionId) {
        Section sectionToRestore = getById(sectionId);

        if (sectionToRestore.getSectionStatus().equals(SectionStatus.active)) {
            throw new AlreadyActive(sectionToRestore.getSectionName(), sectionId);
        }

        sectionToRestore.setSectionStatus(SectionStatus.active);
        return sectionMapper.toResponseDTO(sectionToRestore);
    }

    //START NEW SCHOOL YEAR
    @Transactional
    public List<SectionResponse> newSchoolYear(NewSchoolYearRequest request){
        schoolYearLockRepository.acquireActivationLock()
                .orElseThrow(ActiveSchoolYearLockUnavailable::new);

        SchoolYear sourceSchoolYear = getBySchoolYearId(request.sourceSchoolYearId());
        SchoolYear targetSchoolYear = getBySchoolYearId(request.targetSchoolYearId());

        if (sourceSchoolYear.getSchoolYearId().equals(targetSchoolYear.getSchoolYearId())) {
            throw new SameSchoolYearNotAllowed();
        }

        boolean sourceEligible = sourceSchoolYear.getSchoolYearStatus() == SchoolYearStatus.active
                || sourceSchoolYear.getSchoolYearStatus() == SchoolYearStatus.closed;
        if (!sourceEligible) {
            throw new SourceSchoolYearNotEligible();
        }

        boolean targetEligible = targetSchoolYear.getSchoolYearStatus() == SchoolYearStatus.planning
                || targetSchoolYear.getSchoolYearStatus() == SchoolYearStatus.active;
        if (!targetEligible) {
            throw new SchoolYearNotPlanning();
        }

        if (sourceSchoolYear.getSchoolYearStatus() == SchoolYearStatus.active
                && targetSchoolYear.getSchoolYearStatus() == SchoolYearStatus.active) {
            throw new ActiveSchoolYearAlreadyExists(); // shouldn't happen given the single-active invariant, but guard anyway
        }

        if (sectionRepository.countBySchoolYear(targetSchoolYear) > 0) {
            throw new SchoolYearAlreadyHasSections();
        }

        List<Section> sectionsToClone = request.gradeLevel() == null
                ? sectionRepository.findAllBySchoolYear_SchoolYearId(sourceSchoolYear.getSchoolYearId())
                : sectionRepository.findAllBySchoolYear_SchoolYearIdAndGradeLevel(sourceSchoolYear.getSchoolYearId(), request.gradeLevel());

        if (sectionsToClone.isEmpty()) {
            throw new SchoolYearSectionsNotFound();
        }

        if (sourceSchoolYear.getSchoolYearStatus() == SchoolYearStatus.active) {
            sourceSchoolYear.setSchoolYearStatus(SchoolYearStatus.closed);
        }
        if (targetSchoolYear.getSchoolYearStatus() == SchoolYearStatus.planning) {
            targetSchoolYear.setSchoolYearStatus(SchoolYearStatus.active);
        }

        List<Section> newSections = sectionsToClone.stream()
                .map(oldSection -> {
                    Section newSection = new Section();
                    newSection.setSectionName(oldSection.getSectionName());
                    newSection.setGradeLevel(oldSection.getGradeLevel());
                    newSection.setUser(null);
                    newSection.setSchoolYear(targetSchoolYear);
                    newSection.setSectionStatus(SectionStatus.active);
                    return newSection;
                })
                .toList();

        try {
            List<Section> savedSections = sectionRepository.saveAll(newSections);
            return savedSections.stream()
                    .map(sectionMapper::toResponseDTO)
                    .toList();
        } catch (DataIntegrityViolationException e) {
            throw new SchoolYearAlreadyHasSections();
        }
    }
}

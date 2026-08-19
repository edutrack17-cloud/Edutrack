package com.edutrack.section.service;

import com.edutrack.schoolyear.entity.SchoolYear;
import com.edutrack.schoolyear.enums.SchoolYearStatus;
import com.edutrack.schoolyear.exception.ActiveSchoolYearNotFound;
import com.edutrack.schoolyear.exception.SchoolYearAlreadyActive;
import com.edutrack.schoolyear.exception.SchoolYearAlreadyExists;
import com.edutrack.schoolyear.exception.SchoolYearNotFound;
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
import com.edutrack.user.entity.User;
import com.edutrack.user.enums.AccountStatus;
import com.edutrack.user.exception.AccountDisabled;
import com.edutrack.user.exception.UserNotFoundException;
import com.edutrack.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    public SectionService(SectionRepository sectionRepository, UserRepository userRepository, SectionMapper sectionMapper, SchoolYearRepository schoolYearRepository) {
        this.sectionRepository = sectionRepository;
        this.userRepository = userRepository;
        this.sectionMapper = sectionMapper;
        this.schoolYearRepository = schoolYearRepository;
    }

    //CREATE
    @Transactional
    public SectionResponse createSection(CreateSectionRequest sectionRequest){
        User adviserToBeAssign = userRepository.findById(sectionRequest.userId()).orElseThrow(() -> new UserNotFoundException(sectionRequest.userId()));
        SchoolYear schoolYearToBeAssign = getBySchoolYearId(sectionRequest.schoolYear());

        if (sectionRepository.existsBySectionNameAndSchoolYear_SchoolYearId(sectionRequest.sectionName(), sectionRequest.schoolYear())){
            throw new SectionAlreadyExists(sectionRequest.sectionName());
        }

        Section sectionEntity = sectionMapper.toEntity(sectionRequest);
        sectionEntity.setUser(adviserToBeAssign);
        sectionEntity.setSchoolYear(schoolYearToBeAssign);

        Section savedSection = sectionRepository.save(sectionEntity);
        return sectionMapper.toResponseDTO(savedSection);
    }

    //READ
    public Page<SectionResponse> getSection(String fullName, GradeLevel gradeLevel, SectionStatus sectionStatus, String sectionName, Pageable pageable){
        Specification<Section> filters = Specification
                .where(SectionSpecification.hasName(fullName))
                .and(SectionSpecification.hasGradeLevel(gradeLevel))
                .and(SectionSpecification.hasStatus(sectionStatus))
                .and(SectionSpecification.hasSectionName(sectionName));
        return sectionRepository.findAll(filters ,pageable).map(sectionMapper::toResponseDTO);
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

        if (updateSectionRequest.userId() != null &&
                (sectionToUpdate.getUser() == null ||
                 !sectionToUpdate.getUser().getUserId().equals(updateSectionRequest.userId()))) {
            User newAdviser = getByUserId(updateSectionRequest.userId());
            sectionToUpdate.setUser(newAdviser);
            fieldsChanged = true;
        }

        if (!fieldsChanged) {
            throw new NoChangesDetected();
        }

        return sectionMapper.toResponseDTO(sectionToUpdate);
    }

    //ARCHIVE
    @Transactional
    public SectionResponse archiveSection(Integer sectionId) {
        Section sectionToArchive = getById(sectionId);

        if (sectionToArchive.getSectionStatus().equals(SectionStatus.archived)) {
            throw new AlreadyArchived(sectionToArchive.getSectionName(), sectionId);
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
        SchoolYear currentSchoolYear = schoolYearRepository
                .findBySchoolYearStatus(SchoolYearStatus.active)
                .orElseThrow(ActiveSchoolYearNotFound::new);

        SchoolYear sourceSchoolYear = getBySchoolYearId(request.sourceSchoolYearId());
        SchoolYear targetSchoolYear = getBySchoolYearId(request.targetSchoolYearId());

        if (sourceSchoolYear.getSchoolYearId().equals(targetSchoolYear.getSchoolYearId())) {
            throw new SameSchoolYearNotAllowed();
        }

        if (targetSchoolYear.getSchoolYearStatus() != SchoolYearStatus.planning) {
            throw new SchoolYearNotPlanning();
        }

        if (sectionRepository.countBySchoolYear(targetSchoolYear) > 0) {
            throw new SchoolYearAlreadyHasSections();
        }

        List<Section> sectionsToClone;

        if (request.gradeLevel() == null){
            sectionsToClone = sectionRepository.findAllBySchoolYear_SchoolYearId(sourceSchoolYear.getSchoolYearId());
        } else {
            sectionsToClone = sectionRepository.findAllBySchoolYear_SchoolYearIdAndGradeLevel(sourceSchoolYear.getSchoolYearId(), request.gradeLevel());
        }

        if (sectionsToClone.isEmpty()) {
            throw new SchoolYearSectionsNotFound();
        }

        currentSchoolYear.setSchoolYearStatus(SchoolYearStatus.closed);
        targetSchoolYear.setSchoolYearStatus(SchoolYearStatus.active);

        List<Section> newSections = sectionsToClone.stream()
                .map(oldSection -> {
                    Section newSection = new Section();
                    newSection.setSectionName(oldSection.getSectionName());
                    newSection.setGradeLevel(oldSection.getGradeLevel());
                    newSection.setUser(oldSection.getUser());
                    newSection.setSchoolYear(targetSchoolYear);
                    newSection.setSectionStatus(SectionStatus.active);
                    return newSection;
                })
                .toList();

        List<Section> savedSections = sectionRepository.saveAll(newSections);

        return savedSections.stream()
                .map(sectionMapper::toResponseDTO)
                .toList();
    }
}

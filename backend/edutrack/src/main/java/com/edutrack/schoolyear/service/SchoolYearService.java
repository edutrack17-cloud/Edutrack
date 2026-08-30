package com.edutrack.schoolyear.service;

import com.edutrack.schoolyear.dto.request.CreateSchoolYearRequest;
import com.edutrack.schoolyear.dto.request.UpdateSchoolYearRequest;
import com.edutrack.schoolyear.dto.response.SchoolYearResponse;
import com.edutrack.schoolyear.entity.SchoolYear;
import com.edutrack.schoolyear.enums.SchoolYearStatus;
import com.edutrack.schoolyear.exception.*;
import com.edutrack.schoolyear.mapper.SchoolYearMapper;
import com.edutrack.schoolyear.repository.SchoolYearLockRepository;
import com.edutrack.schoolyear.repository.SchoolYearRepository;
import com.edutrack.schoolyear.specification.SchoolYearSpecification;
import com.edutrack.shared.exception.NoChangesDetected;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class SchoolYearService {
    private static final Map<SchoolYearStatus, Set<SchoolYearStatus>> ALLOWED_TRANSITIONS = Map.of(
            SchoolYearStatus.planning, Set.of(SchoolYearStatus.active, SchoolYearStatus.archived),
            SchoolYearStatus.active, Set.of(SchoolYearStatus.closed, SchoolYearStatus.archived),
            SchoolYearStatus.closed, Set.of(SchoolYearStatus.archived),
            SchoolYearStatus.archived, Set.of()
    );

    private final SchoolYearRepository schoolYearRepository;
    private final SchoolYearMapper schoolYearMapper;
    private final SchoolYearLockRepository schoolYearLockRepository;

    public SchoolYearService(SchoolYearRepository schoolYearRepository,
                             SchoolYearMapper schoolYearMapper,
                             SchoolYearLockRepository schoolYearLockRepository){
        this.schoolYearRepository = schoolYearRepository;
        this.schoolYearMapper = schoolYearMapper;
        this.schoolYearLockRepository = schoolYearLockRepository;
    }

    //CREATE
    @Transactional
    public SchoolYearResponse createSchoolYear(CreateSchoolYearRequest schoolYearRequest){

        if (schoolYearRepository.existsBySchoolYearNameIgnoreCase(schoolYearRequest.schoolYearName().trim())){
            throw new SchoolYearAlreadyExists(schoolYearRequest.schoolYearName());
        }

        if (!schoolYearRequest.startDate().isBefore(schoolYearRequest.endDate())){
            throw new InvalidSchoolYearDateRange();
        }

        SchoolYear schoolYearToEntity = schoolYearMapper.toEntity(schoolYearRequest);
        schoolYearToEntity.setSchoolYearName(schoolYearRequest.schoolYearName().trim());
        schoolYearToEntity.setSchoolYearStatus(SchoolYearStatus.planning);

        try {
            SchoolYear savedSchoolYear = schoolYearRepository.save(schoolYearToEntity);
            return schoolYearMapper.toResponseDTO(savedSchoolYear);
        } catch (DataIntegrityViolationException e) {
            throw new SchoolYearAlreadyExists(schoolYearRequest.schoolYearName());
        }
    }

    //READ
    public Page<SchoolYearResponse> getSchoolYear(String schoolYearName, SchoolYearStatus schoolYearStatus, Pageable pageable){
        Specification<SchoolYear> filters = Specification
                .where(SchoolYearSpecification.hasName(schoolYearName)).
                and(SchoolYearSpecification.hasStatus(schoolYearStatus));

        return schoolYearRepository.findAll(filters, pageable).map(schoolYearMapper::toResponseDTO);
    }

    //UPDATE
    @Transactional
    public SchoolYearResponse updateSchoolYear(Long schoolYearId, UpdateSchoolYearRequest updateSchoolYearRequest){
        SchoolYear schoolYearToUpdate = schoolYearRepository.findById(schoolYearId).orElseThrow(SchoolYearNotFound::new);
        boolean fieldsChanged = false;

        String requestedName = updateSchoolYearRequest.schoolYearName() != null
                ? updateSchoolYearRequest.schoolYearName().trim()
                : null;

        if (requestedName != null && !requestedName.isEmpty() &&
                !schoolYearToUpdate.getSchoolYearName().equals(requestedName)
        ){
            if (schoolYearRepository.existsBySchoolYearNameIgnoreCase(requestedName)){
                throw new SchoolYearAlreadyExists(requestedName);
            }

            schoolYearToUpdate.setSchoolYearName(requestedName);
            fieldsChanged = true;
        }

        if (updateSchoolYearRequest.startDate() != null &&
                !schoolYearToUpdate.getStartDate().equals(updateSchoolYearRequest.startDate())){

            schoolYearToUpdate.setStartDate(updateSchoolYearRequest.startDate());
            fieldsChanged = true;
        }

        if (updateSchoolYearRequest.endDate() != null &&
                !schoolYearToUpdate.getEndDate().equals(updateSchoolYearRequest.endDate())){

            schoolYearToUpdate.setEndDate(updateSchoolYearRequest.endDate());
            fieldsChanged = true;
        }

        if (!fieldsChanged){
            throw new NoChangesDetected();
        }

        if (!schoolYearToUpdate.getStartDate().isBefore(schoolYearToUpdate.getEndDate())){
            throw new InvalidSchoolYearDateRange();
        }

        schoolYearToUpdate.setUpdatedAt(LocalDate.now());

        try {
            SchoolYear updated = schoolYearRepository.saveAndFlush(schoolYearToUpdate);
            return schoolYearMapper.toResponseDTO(updated);
        } catch (DataIntegrityViolationException e) {
            throw new SchoolYearAlreadyExists(updateSchoolYearRequest.schoolYearName());
        }
    }

    //ARCHIVE
    @Transactional
    public SchoolYearResponse archiveSchoolYear(Long schoolYearId){
        SchoolYear schoolYearToUpdate = schoolYearRepository.findById(schoolYearId).orElseThrow(SchoolYearNotFound::new);

        if (schoolYearToUpdate.getSchoolYearStatus().equals(SchoolYearStatus.archived)){
            throw new SchoolYearAlreadyArchived();
        }

        validateTransition(schoolYearToUpdate.getSchoolYearStatus(), SchoolYearStatus.archived);

        schoolYearToUpdate.setSchoolYearStatus(SchoolYearStatus.archived);
        schoolYearToUpdate.setUpdatedAt(LocalDate.now());
        return schoolYearMapper.toResponseDTO(schoolYearToUpdate);
    }

    //MARK AS ACTIVE
    @Transactional
    public SchoolYearResponse restoreSchoolYear(Long schoolYearId){
        schoolYearLockRepository.acquireActivationLock()
                .orElseThrow(ActiveSchoolYearLockUnavailable::new);

        SchoolYear schoolYearToUpdate = schoolYearRepository.findById(schoolYearId).orElseThrow(SchoolYearNotFound::new);

        if (schoolYearToUpdate.getSchoolYearStatus().equals(SchoolYearStatus.active)){
            throw new SchoolYearAlreadyActive();
        }

        validateTransition(schoolYearToUpdate.getSchoolYearStatus(), SchoolYearStatus.active);

        if (schoolYearRepository.existsBySchoolYearStatusEquals(SchoolYearStatus.active)){
            throw new ActiveSchoolYearAlreadyExists();
        }

        schoolYearToUpdate.setSchoolYearStatus(SchoolYearStatus.active);
        schoolYearToUpdate.setUpdatedAt(LocalDate.now());
        return schoolYearMapper.toResponseDTO(schoolYearToUpdate);
    }

    //MARK AS CLOSED
    @Transactional
    public SchoolYearResponse closeSchoolYear(Long schoolYearId){
        SchoolYear schoolYearToClose = schoolYearRepository.findById(schoolYearId).orElseThrow(SchoolYearNotFound::new);

        if (schoolYearToClose.getSchoolYearStatus() == SchoolYearStatus.closed){
            throw new SchoolYearAlreadyClosed();
        }

        validateTransition(schoolYearToClose.getSchoolYearStatus(), SchoolYearStatus.closed);

        schoolYearToClose.setSchoolYearStatus(SchoolYearStatus.closed);
        schoolYearToClose.setUpdatedAt(LocalDate.now());
        return schoolYearMapper.toResponseDTO(schoolYearToClose);
    }

    //MARK AS PLANNING
    @Transactional
    public SchoolYearResponse markAsPlanning(Long schoolYearId){
        SchoolYear schoolYearToUpdate = schoolYearRepository.findById(schoolYearId).orElseThrow(SchoolYearNotFound::new);

        if (schoolYearToUpdate.getSchoolYearStatus().equals(SchoolYearStatus.planning)){
            throw new SchoolYearAlreadyPlanning();
        }

        validateTransition(schoolYearToUpdate.getSchoolYearStatus(), SchoolYearStatus.planning);

        schoolYearToUpdate.setSchoolYearStatus(SchoolYearStatus.planning);
        schoolYearToUpdate.setUpdatedAt(LocalDate.now());
        return schoolYearMapper.toResponseDTO(schoolYearToUpdate);
    }

    private void validateTransition(SchoolYearStatus from, SchoolYearStatus to){
        if (!ALLOWED_TRANSITIONS.getOrDefault(from, Set.of()).contains(to)){
            throw new InvalidSchoolYearTransition(from, to);
        }
    }
}
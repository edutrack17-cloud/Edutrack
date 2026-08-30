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

@Service
@Transactional(readOnly = true)
public class SchoolYearService {
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

        if (schoolYearRepository.existsBySchoolYearNameIgnoreCase(schoolYearRequest.schoolYearName())){
            throw new SchoolYearAlreadyExists(schoolYearRequest.schoolYearName());
        }

        SchoolYear schoolYearToEntity = schoolYearMapper.toEntity(schoolYearRequest);
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
        if (updateSchoolYearRequest.schoolYearName() != null &&
                !updateSchoolYearRequest.schoolYearName().isEmpty() &&
                !schoolYearToUpdate.getSchoolYearName().equalsIgnoreCase(updateSchoolYearRequest.schoolYearName())
        ){
            if (schoolYearRepository.existsBySchoolYearNameIgnoreCase(updateSchoolYearRequest.schoolYearName())){
                throw new SchoolYearAlreadyExists(updateSchoolYearRequest.schoolYearName());
            }

            schoolYearToUpdate.setSchoolYearName(updateSchoolYearRequest.schoolYearName());
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

        schoolYearToUpdate.setSchoolYearStatus(SchoolYearStatus.archived);
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

        if (schoolYearRepository.existsBySchoolYearStatusEquals(SchoolYearStatus.active)){
            throw new ActiveSchoolYearAlreadyExists();
        }

        schoolYearToUpdate.setSchoolYearStatus(SchoolYearStatus.active);
        return schoolYearMapper.toResponseDTO(schoolYearToUpdate);
    }

    //MARK AS CLOSED
    @Transactional
    public SchoolYearResponse closeSchoolYear(Long schoolYearId){
        SchoolYear schoolYearToClose = schoolYearRepository.findById(schoolYearId).orElseThrow(SchoolYearNotFound::new);

        if (schoolYearToClose.getSchoolYearStatus() == SchoolYearStatus.closed){
            throw new SchoolYearAlreadyClosed();
        }

        schoolYearToClose.setSchoolYearStatus(SchoolYearStatus.closed);
        return schoolYearMapper.toResponseDTO(schoolYearToClose);
    }

    //MARK AS PLANNING
    @Transactional
    public SchoolYearResponse markAsPlanning(Long schoolYearId){
        SchoolYear schoolYearToUpdate = schoolYearRepository.findById(schoolYearId).orElseThrow(SchoolYearNotFound::new);

        if (schoolYearToUpdate.getSchoolYearStatus().equals(SchoolYearStatus.planning)){
            throw new SchoolYearAlreadyPlanning();
        }

        schoolYearToUpdate.setSchoolYearStatus(SchoolYearStatus.planning);
        return schoolYearMapper.toResponseDTO(schoolYearToUpdate);
    }
}
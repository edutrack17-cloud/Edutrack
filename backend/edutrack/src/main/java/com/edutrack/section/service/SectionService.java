package com.edutrack.section.service;

import com.edutrack.section.dto.request.CreateSectionRequest;
import com.edutrack.section.dto.request.UpdateSectionRequest;
import com.edutrack.section.dto.response.SectionResponse;
import com.edutrack.section.entity.Section;
import com.edutrack.section.enums.SectionStatus;
import com.edutrack.section.exception.AlreadyActive;
import com.edutrack.section.exception.AlreadyArchived;
import com.edutrack.section.exception.SectionAlreadyExists;
import com.edutrack.section.exception.SectionNotFound;
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

@Service
public class SectionService {
    private final SectionRepository sectionRepository;
    private final UserRepository userRepository;
    private final SectionMapper sectionMapper;

    public SectionService(SectionRepository sectionRepository, UserRepository userRepository, SectionMapper sectionMapper) {
        this.sectionRepository = sectionRepository;
        this.userRepository = userRepository;
        this.sectionMapper = sectionMapper;
    }

    //CREATE
    @Transactional
    public SectionResponse createSection(CreateSectionRequest sectionRequest){
        User adviser = userRepository.findById(sectionRequest.userId())
                .orElseThrow(() -> new UserNotFoundException(sectionRequest.userId()));

        if (sectionRepository.existsBySectionNameIgnoreCase(sectionRequest.sectionName())){
            throw new SectionAlreadyExists(sectionRequest.sectionName());
        }

        if (adviser.getAccountStatus().equals(AccountStatus.disabled)){
            throw new AccountDisabled();
        }

        Section sectionToBeSaved = sectionMapper.toEntity(sectionRequest);
        sectionToBeSaved.setUser(adviser);

        Section savedSection = sectionRepository.save(sectionToBeSaved);

        return sectionMapper.toResponseDTO(savedSection);
    }

    //READ
    @Transactional(readOnly = true)
    public Page<SectionResponse> getSections(String fullName, Pageable pageable){
        Specification<Section> filters = Specification
                .where(SectionSpecification.hasName(fullName));
        return sectionRepository.findAll(filters, pageable).map(sectionMapper::toResponseDTO);
    }

    //UPDATE
    @Transactional
    public SectionResponse updateSection(int sectionId, UpdateSectionRequest updateRequest){
        Section sectionToUpdate = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new SectionNotFound(sectionId));
        boolean changed = false;

        if (updateRequest.sectionName() != null && !updateRequest.sectionName().isBlank() && !sectionToUpdate.getSectionName().equalsIgnoreCase(updateRequest.sectionName())){
            if (sectionRepository.existsBySectionNameIgnoreCase(updateRequest.sectionName())){
                throw new SectionAlreadyExists(updateRequest.sectionName());
            }
            sectionToUpdate.setSectionName(updateRequest.sectionName());
            changed = true;
        }

        if (updateRequest.gradeLevel() != null && !sectionToUpdate.getGradeLevel().equals(updateRequest.gradeLevel())){
            sectionToUpdate.setGradeLevel(updateRequest.gradeLevel());
            changed = true;
        }

        if (updateRequest.userId() != null && sectionToUpdate.getUser().getUserId() != updateRequest.userId()){
            User newAdviser = userRepository.findById(updateRequest.userId()).orElseThrow(() -> new UserNotFoundException(updateRequest.userId()));

            if (newAdviser.getAccountStatus().equals(AccountStatus.disabled)){
                throw new AccountDisabled();
            }

            sectionToUpdate.setUser(newAdviser);
            changed = true;
        }

        if (!changed){
            throw new NoChangesDetected();
        }

        Section savedSection = sectionRepository.save(sectionToUpdate);
        return sectionMapper.toResponseDTO(savedSection);
    }

    //ARCHIVE
    @Transactional
    public SectionResponse archiveSection(int sectionId){
        Section sectionToArchive = sectionRepository.findById(sectionId).orElseThrow(() -> new SectionNotFound(sectionId));

        if (sectionToArchive.getSectionStatus().equals(SectionStatus.archived)){
            throw new AlreadyArchived(sectionToArchive.getSectionName(), sectionId);
        }

        sectionToArchive.setSectionStatus(SectionStatus.archived);
        return sectionMapper.toResponseDTO(sectionToArchive);
    }

    //RESTORE
    @Transactional
    public SectionResponse restoreSection(int sectionId){
        Section sectionToRestore = sectionRepository.findById(sectionId).orElseThrow(() -> new SectionNotFound(sectionId));

        if (sectionToRestore.getSectionStatus().equals(SectionStatus.active)){
            throw new AlreadyActive(sectionToRestore.getSectionName(), sectionId);
        }

        sectionToRestore.setSectionStatus(SectionStatus.active);
        return sectionMapper.toResponseDTO(sectionToRestore);
    }
}

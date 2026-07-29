package com.edutrack.section.service;

import com.edutrack.schoolyear.entity.SchoolYear;
import com.edutrack.schoolyear.exception.SchoolYearNotFound;
import com.edutrack.schoolyear.repository.SchoolYearRepository;
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
@Transactional(readOnly = true)
public class SectionService {
    private final SectionRepository sectionRepository;
    private final UserRepository userRepository;
    private final SectionMapper sectionMapper;
    private final SchoolYearRepository schoolYearRepository;

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
        SchoolYear schoolYearToBeAssign = schoolYearRepository.findById(sectionRequest.schoolYear()).orElseThrow(SchoolYearNotFound::new);



    }
}

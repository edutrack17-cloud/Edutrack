package com.edutrack.section.service;

import com.edutrack.section.dto.request.CreateSectionRequest;
import com.edutrack.section.dto.response.SectionResponse;
import com.edutrack.section.entity.Section;
import com.edutrack.section.enums.GradeLevel;
import com.edutrack.section.enums.SectionStatus;
import com.edutrack.section.exception.SectionAlreadyExists;
import com.edutrack.section.mapper.SectionMapper;
import com.edutrack.section.repository.SectionRepository;
import com.edutrack.shared.util.NameUtil;
import com.edutrack.user.entity.User;
import com.edutrack.user.enums.AccountStatus;
import com.edutrack.user.exception.AccountDisabled;
import com.edutrack.user.exception.UserNotFoundException;
import com.edutrack.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SectionServiceTest {
    @Mock
    private SectionRepository sectionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SectionMapper sectionMapper;

    @InjectMocks
    private SectionService sectionService;

    //HAPPY CASE (CREATE)
    @Test
    void sectionCreated(){
        //ARRANGE
        CreateSectionRequest sectionRequest = new CreateSectionRequest("Apple", GradeLevel.Grade_6, 2L);

        User fakeUser = new User();
        fakeUser.setUserId(2L);
        fakeUser.setFirstName("John");
        fakeUser.setLastName("Doe");
        when(userRepository.findById(2L)).thenReturn(Optional.of(fakeUser));

        Section fakeSection = new Section();
        when(sectionMapper.toEntity(sectionRequest)).thenReturn(fakeSection);

        Section savedSection = new Section();
        when(sectionRepository.save(fakeSection)).thenReturn(savedSection);

        SectionResponse sectionResponse = new SectionResponse(1, "Apple", GradeLevel.Grade_6, SectionStatus.active, NameUtil.buildFullName(fakeUser.getFirstName(), fakeUser.getMiddleName(), fakeUser.getLastName()));
        when(sectionMapper.toResponseDTO(savedSection)).thenReturn(sectionResponse);

        //ACT
        SectionResponse createdSection = sectionService.createSection(sectionRequest);

        //ASSERT
        verify(sectionRepository).save(fakeSection);
        assertEquals("Apple", createdSection.sectionName());
    }

    //EDGE CASE (CREATE)
    @Test
    void disabledUserAccount(){
        //ARRANGE
        CreateSectionRequest sectionRequest = new CreateSectionRequest("Apple", GradeLevel.Grade_6, 3L);

        User fakeUser = new User();
        fakeUser.setUserId(3L);
        fakeUser.setFirstName("Crom");
        fakeUser.setAccountStatus(AccountStatus.disabled);
        when(userRepository.findById(fakeUser.getUserId())).thenReturn(Optional.of(fakeUser));

        //ACT + ASSERT
        assertThrows(AccountDisabled.class, () -> sectionService.createSection(sectionRequest));
        verify(sectionRepository, never()).save(any());

    }

    //EDGE CASE (CREATE)
    @Test
    void sectionAlreadyExists(){
        //ARRANGE
        CreateSectionRequest sectionRequest = new CreateSectionRequest("Apple", GradeLevel.Grade_6, 1L);
        when(sectionRepository.existsBySectionNameIgnoreCase("Apple")).thenReturn(true);

        User fakeAdviser = new User();
        fakeAdviser.setAccountStatus(AccountStatus.active);
        when(userRepository.findById(1L)).thenReturn(Optional.of(fakeAdviser));

        assertThrows(SectionAlreadyExists.class, () -> sectionService.createSection(sectionRequest));
        verify(sectionRepository, never()).save(any());
    }

    //EDGE CASE (CREATE)
    @Test
    void userNotFound(){
        //ARRANGE
        CreateSectionRequest sectionRequest = new CreateSectionRequest("Apple", GradeLevel.Grade_6, 1L);
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        //ACT + ASSERT
        assertThrows(UserNotFoundException.class, () -> sectionService.createSection(sectionRequest));
        verify(sectionRepository, never()).save(any());
    }

    //HAPPY CASE (ARCHIVE)
    @Test
    void sectionArchived(){
        //ARRANGE
        SectionResponse fakeResponse = new SectionResponse(1, "Apple", GradeLevel.Grade_6, SectionStatus.active, "Teach");
        Section fakeSection = new Section();
        fakeSection.setSectionId(1);
        fakeSection.setSectionStatus(SectionStatus.active);
        when(sectionRepository.findById(fakeSection.getSectionId())).thenReturn(Optional.of(fakeSection));
        when(sectionMapper.toResponseDTO(fakeSection)).thenReturn(fakeResponse);

        //ACT
        SectionResponse archivedSection = sectionService.archiveSection(fakeSection.getSectionId());

        //ASSERT
        verify(sectionMapper).toResponseDTO(fakeSection);
        assertThat(fakeSection.getSectionStatus().equals(SectionStatus.archived));
    }

}

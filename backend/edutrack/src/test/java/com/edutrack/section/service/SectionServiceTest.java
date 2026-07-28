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


}

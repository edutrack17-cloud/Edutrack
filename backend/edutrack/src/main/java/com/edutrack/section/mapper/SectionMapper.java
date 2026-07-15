package com.edutrack.section.mapper;

import com.edutrack.section.dto.request.CreateSectionRequest;
import com.edutrack.section.dto.response.SectionResponse;
import com.edutrack.section.entity.Section;
import com.edutrack.shared.util.NameUtil;
import com.edutrack.user.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", imports = NameUtil.class)
public interface SectionMapper {

    @Mapping(target = "adviser", expression = "java(NameUtil.buildFullName(section.getUser().getFirstName(), section.getUser().getMiddleName(), section.getUser().getLastName()))")
    SectionResponse toResponseDTO(Section section);

    @Mapping(target = "sectionId", ignore = true)
    @Mapping(target = "sectionStatus", ignore = true)
    @Mapping(target = "user", ignore = true)
    Section toEntity(CreateSectionRequest clientRequest);

}

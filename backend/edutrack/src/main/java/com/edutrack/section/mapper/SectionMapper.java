package com.edutrack.section.mapper;

import com.edutrack.section.dto.request.CreateSectionRequest;
import com.edutrack.section.dto.response.SectionResponse;
import com.edutrack.section.entity.Section;
import com.edutrack.shared.util.NameUtil;
import com.edutrack.user.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface SectionMapper {

    @Mapping(target = "adviser", expression = "java(mapAdviserName(section.getUser()))")
    @Mapping(target = "schoolYear", expression = "java(section.getSchoolYear().getSchoolYearName())")
    SectionResponse toResponseDTO(Section section);

    @Mapping(target = "sectionId", ignore = true)
    @Mapping(target = "sectionStatus", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "schoolYear", ignore = true)
    Section toEntity(CreateSectionRequest clientRequest);

    default String mapAdviserName(User user) {
        if (user == null) {
            return null; // swap for "Unassigned" if you'd rather the API say so explicitly
        }
        return NameUtil.buildFullName(user.getFirstName(), user.getMiddleName(), user.getLastName());
    }
}
package com.edutrack.schoolyear.mapper;

import com.edutrack.schoolyear.dto.request.CreateSchoolYearRequest;
import com.edutrack.schoolyear.dto.response.SchoolYearResponse;
import com.edutrack.schoolyear.entity.SchoolYear;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface SchoolYearMapper {
    SchoolYearResponse toResponseDTO(SchoolYear schoolYear);

    @Mapping(target = "schoolYearId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    SchoolYear toEntity(CreateSchoolYearRequest schoolYearRequest);
}

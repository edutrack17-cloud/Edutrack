package com.edutrack.student.mapper;

import com.edutrack.shared.util.NameUtil;
import com.edutrack.student.dto.request.CreateStudentRequest;
import com.edutrack.student.dto.response.StudentResponse;
import com.edutrack.student.entity.Student;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", imports = NameUtil.class)
public interface StudentMapper {

    @Mapping(target = "fullName",
            expression = "java(NameUtil.buildFullName(student.getFirstName(), student.getMiddleName(), student.getLastName()))")
    StudentResponse toStudentResponseDTO(Student student);

    @Mapping(target = "studentId", ignore = true)
    @Mapping(target = "studentStatus", ignore = true)
    Student toEntity(CreateStudentRequest studentRequest);
}

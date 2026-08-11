package com.edutrack.student.mapper;

import com.edutrack.section.entity.Section;
import com.edutrack.section.mapper.SectionMapper;
import com.edutrack.shared.util.GradeAndSectionUtil;
import com.edutrack.shared.util.NameUtil;
import com.edutrack.student.dto.request.CreateStudentRequest;
import com.edutrack.student.dto.response.StudentEditResponse;
import com.edutrack.student.dto.response.StudentResponse;
import com.edutrack.student.entity.Student;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(
        componentModel = "spring",
        imports = {NameUtil.class, GradeAndSectionUtil.class},
        uses = SectionMapper.class)
public interface StudentMapper {

    @Mapping(target = "fullName",
            expression = "java(NameUtil.buildFullName(student.getFirstName(), student.getMiddleName(), student.getLastName()))")
    @Mapping(target = "section", source = "section")
    StudentResponse toStudentResponseDTO(Student student, Section section);

    @Mapping(target = "fullName",
            expression = "java(NameUtil.buildFullName(student.getFirstName(), student.getMiddleName(), student.getLastName()))")
    @Mapping(
            target = "gradeAndSection",
            expression = "java(GradeAndSectionUtil.buildGradeAndSection(" +
                    "assignment.getSection().getSectionName(), " +
                    "assignment.getSection().getGradeLevel()))"
    )
    StudentEditResponse toStudentEditResponseDTO(Student student, StudentSectionAssignment assignment);

    @Mapping(target = "studentId", ignore = true)
    @Mapping(target = "studentStatus", ignore = true)
    @Mapping(target = "admissionType", source = "admissionType")
    Student toEntity(CreateStudentRequest studentRequest);
}

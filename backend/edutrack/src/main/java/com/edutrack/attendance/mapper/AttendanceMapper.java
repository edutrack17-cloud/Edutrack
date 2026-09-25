package com.edutrack.attendance.mapper;

import com.edutrack.attendance.dto.response.AttendanceResponse;
import com.edutrack.attendance.entity.Attendance;
import com.edutrack.section.enums.GradeLevel;
import com.edutrack.shared.util.GradeAndSectionUtil;
import com.edutrack.shared.util.NameUtil;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", imports = {NameUtil.class, GradeAndSectionUtil.class})
public interface AttendanceMapper {

    default String getStudentName(Attendance attendance) {
        return NameUtil.buildFullName(
                attendance.getStudentSectionAssignment()
                        .getStudent().getFirstName(),
                attendance.getStudentSectionAssignment()
                        .getStudent().getMiddleName(),
                attendance.getStudentSectionAssignment()
                        .getStudent().getLastName()
        );
    }

    default String getStudentRfid(Attendance attendance) {
        return attendance.getStudentSectionAssignment()
                .getStudent()
                .getRfid();
    }

    default String getStudentSection(Attendance attendance) {
        return attendance.getStudentSectionAssignment()
                .getSection()
                .getSectionName();
    }

    default GradeLevel getStudentGradeLevel(Attendance attendance) {
        return attendance.getStudentSectionAssignment()
                .getSection()
                .getGradeLevel();
    }

    @Mapping(target = "studentName", expression = "java(getStudentName(attendance))")
    @Mapping(target = "rfid", expression = "java(getStudentRfid(attendance))")
    @Mapping(target = "gradeAndSection", expression = "java(GradeAndSectionUtil." +
            "buildGradeAndSection(getStudentSection(attendance), getStudentGradeLevel(attendance)))")
    AttendanceResponse toAttendanceResponseDTO(Attendance attendance);
}
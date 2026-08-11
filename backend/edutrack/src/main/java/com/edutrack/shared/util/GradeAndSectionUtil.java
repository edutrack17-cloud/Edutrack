package com.edutrack.shared.util;

import com.edutrack.section.enums.GradeLevel;

public class GradeAndSectionUtil {
    private GradeAndSectionUtil(){}

    public static String buildGradeAndSection(String sectionName, GradeLevel gradeLevel){
        return gradeLevel + " - " + sectionName;
    }
}

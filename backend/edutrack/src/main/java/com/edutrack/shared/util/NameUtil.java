package com.edutrack.shared.util;

public class NameUtil {

    private NameUtil(){}

    public static String buildFullName(String firstName, String middleName, String lastName){
        String middle = (middleName == null || middleName.isBlank())
                ? ""
                : " " + middleName;
        return lastName + firstName + " " + middle;
    }
}

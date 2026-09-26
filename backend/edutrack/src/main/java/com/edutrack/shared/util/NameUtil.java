package com.edutrack.shared.util;

public class NameUtil {

    private NameUtil() {}

    public static String buildFullName(String firstName, String middleName, String lastName) {
        String first = (firstName == null || firstName.isBlank()) ? "" : firstName;
        String middle = (middleName == null || middleName.isBlank()) ? "" : " " + middleName;
        String last = (lastName == null || lastName.isBlank()) ? "" : lastName + ",";

        return (last + " " + first + middle).trim().replaceAll("\\s+", " ");
    }
}
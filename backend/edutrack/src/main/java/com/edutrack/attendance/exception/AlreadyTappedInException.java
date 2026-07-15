package com.edutrack.attendance.exception;

public class AlreadyTappedInException extends RuntimeException{
    public AlreadyTappedInException(String name){
        super("%s is already tapped in".formatted(name));
    }
}

package com.edutrack.user.dto.request;

public record UpdateUserRequest(
   String username,
   String firstName,
   String middleName,
   String lastName,
   String password
) {}

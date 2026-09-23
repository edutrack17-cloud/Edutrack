package com.edutrack.user.dto.request;

import jakarta.validation.constraints.Size;

public record UpdateUserRequest(
   String username,
   String firstName,
   String middleName,
   String lastName,
   String contactNumber,
   String password
) {}

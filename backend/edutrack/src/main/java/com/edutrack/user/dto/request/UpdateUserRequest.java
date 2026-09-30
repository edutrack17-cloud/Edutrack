package com.edutrack.user.dto.request;

import com.edutrack.user.validation.PasswordsMatch;
import jakarta.validation.constraints.Size;

@PasswordsMatch(passwordField = "password", confirmPasswordField = "confirmPassword",
        message = "Password and confirm password do not match")
public record UpdateUserRequest(
        String username,
        String firstName,
        String middleName,
        String lastName,
        String contactNumber,

        @Size(min = 8, max = 255, message = "Password must be between 8 and 255 characters")
        String password,

        String confirmPassword
) {}
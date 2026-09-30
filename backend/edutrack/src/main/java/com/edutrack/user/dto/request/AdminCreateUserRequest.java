package com.edutrack.user.dto.request;

import com.edutrack.user.validation.PasswordsMatch;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@PasswordsMatch(passwordField = "password", confirmPasswordField = "confirmPassword",
        message = "Password and confirm password do not match")
public record AdminCreateUserRequest(
        @NotBlank(message = "Username is required")
        @Size(max = 100)
        String username,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 255)
        String password,

        @NotBlank(message = "Confirm password is required")
        @Size(min = 8, max = 255)
        String confirmPassword,

        @NotBlank(message = "First name is required")
        @Size(max = 100)
        String firstName,

        @Size(max = 100)
        String middleName,

        @Size(max = 15)
        String contactNumber,

        @NotBlank(message = "Last name is required")
        @Size(max = 100)
        String lastName

) {}
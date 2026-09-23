package com.edutrack.user.dto.request;

import com.edutrack.user.enums.AccountStatus;
import com.edutrack.user.enums.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminCreateUserRequest(
        @NotBlank(message = "Username is required")
        @Size(max = 100)
        String username,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 255)
        String password,

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

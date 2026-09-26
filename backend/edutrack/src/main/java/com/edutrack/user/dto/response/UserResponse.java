package com.edutrack.user.dto.response;

import com.edutrack.user.enums.AccountStatus;
import com.edutrack.user.enums.UserRole;

public record UserResponse(
        Long userId,
        String username,
        String firstName,
        String middleName,
        String lastName,
        String fullName,
        String contactNumber,
        UserRole userRole,
        AccountStatus accountStatus
) {}
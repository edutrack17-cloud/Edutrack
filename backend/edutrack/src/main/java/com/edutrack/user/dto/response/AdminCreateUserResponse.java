package com.edutrack.user.dto.response;

import com.edutrack.user.enums.AccountStatus;
import com.edutrack.user.enums.UserRole;

public record AdminCreateUserResponse(
        Long userId,
        String username,
        String fullName,
        UserRole userRole,
        AccountStatus accountStatus
) {}

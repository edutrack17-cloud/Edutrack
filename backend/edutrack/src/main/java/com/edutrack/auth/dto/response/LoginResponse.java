package com.edutrack.auth.dto.response;

import com.edutrack.user.enums.UserRole;

public record LoginResponse(
        String token,
        Long userId,
        String username,
        UserRole userRole
) {}
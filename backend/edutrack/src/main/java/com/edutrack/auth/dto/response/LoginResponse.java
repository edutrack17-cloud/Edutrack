package com.edutrack.auth.dto.response;

import com.edutrack.user.enums.UserRole;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        Long userId,
        String username,
        UserRole userRole
) {}
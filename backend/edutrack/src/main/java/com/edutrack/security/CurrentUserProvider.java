package com.edutrack.security;

import com.edutrack.user.enums.UserRole;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentUserProvider {

    public CustomUserDetails getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof CustomUserDetails cud)) {
            throw new IllegalStateException("No authenticated user");
        }
        return cud;
    }

    public boolean isTeacher() {
        return getCurrentUser().getUser().getUserRole() == UserRole.teacher;
    }

    public Long getCurrentUserId() {
        return getCurrentUser().getUser().getUserId();
    }
}
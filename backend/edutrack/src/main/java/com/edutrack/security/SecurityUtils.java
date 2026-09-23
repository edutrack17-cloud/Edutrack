package com.edutrack.security;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class SecurityUtils {

    private SecurityUtils() {}

    /**
     * Existing behaviour — callers assume an authenticated user.
     * Will throw if invoked on an anonymous / unauthenticated request.
     * Keep as-is; new code should prefer {@link #getCurrentUserIdOrNull()}
     * when the caller might be anonymous.
     */
    public static Long getCurrentUserId() {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();

        return userDetails.getUser().getUserId();
    }

    /**
     * Null-safe variant.
     * Returns the authenticated user's ID, or {@code null} when the request
     * is anonymous, has no authentication, or the principal is not a
     * {@link CustomUserDetails}. Never throws.
     */
    public static Long getCurrentUserIdOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null
                || !auth.isAuthenticated()
                || auth instanceof AnonymousAuthenticationToken) {
            return null;
        }

        Object principal = auth.getPrincipal();

        if (principal instanceof CustomUserDetails details) {
            return details.getUser().getUserId();
        }

        return null;
    }
}
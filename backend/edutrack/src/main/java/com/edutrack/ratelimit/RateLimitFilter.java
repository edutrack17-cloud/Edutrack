package com.edutrack.ratelimit;

import com.edutrack.security.SecurityUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitService rateLimitService;

    public RateLimitFilter(RateLimitService rateLimitService) {
        this.rateLimitService = rateLimitService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        // Reads (GET/HEAD/OPTIONS) are cheap, idempotent, and safe. Do NOT
        // charge them against the bucket — a single SPA page load fires
        // dozens of these, which used to drain the 100-token budget and
        // starve any subsequent write (e.g. clone batch), making the write
        // look slow when it was really just waiting for a refill.
        String method = request.getMethod();
        if ("GET".equalsIgnoreCase(method)
                || "HEAD".equalsIgnoreCase(method)
                || "OPTIONS".equalsIgnoreCase(method)) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = resolveKey(request);

        boolean allowed = rateLimitService.isAllowed(key);

        if (!allowed) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("""
                    {
                        "status": 429,
                        "message": "Too many requests. Please try again later."
                    }
                    """);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String resolveKey(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.isAuthenticated()) {
            return "user:" + SecurityUtils.getCurrentUserId();
        }

        return "ip:" + request.getRemoteAddr();
    }
}
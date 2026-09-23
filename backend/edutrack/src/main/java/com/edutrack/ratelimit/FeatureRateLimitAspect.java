package com.edutrack.ratelimit;

import com.edutrack.ratelimit.exception.FeatureRateLimitExceededException;
import com.edutrack.security.SecurityUtils;
import io.github.bucket4j.Bandwidth;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
public class FeatureRateLimitAspect {

    private final RateLimitService rateLimitService;

    public FeatureRateLimitAspect(RateLimitService rateLimitService) {
        this.rateLimitService = rateLimitService;
    }

    @Around("@annotation(featureRateLimit)")
    public Object enforce(ProceedingJoinPoint pjp, FeatureRateLimit featureRateLimit) throws Throwable {

        Bandwidth bandwidth = rateLimitService.bandwidthFor(
                featureRateLimit.feature(),
                featureRateLimit.capacity(),
                featureRateLimit.refillTokens(),
                featureRateLimit.refillPeriodSeconds()
        );

        String identity = resolveIdentity();
        String key = "feature:" + featureRateLimit.feature() + ":" + identity;

        if (!rateLimitService.isAllowed(key, bandwidth)) {
            throw new FeatureRateLimitExceededException(featureRateLimit.feature());
        }

        return pjp.proceed();
    }

    /**
     * Prefer the authenticated user's ID. Fall back to the client IP for
     * anonymous endpoints (e.g. forgot-password). Never returns null.
     */
    private String resolveIdentity() {
        Long userId = SecurityUtils.getCurrentUserIdOrNull();
        if (userId != null) {
            return "user:" + userId;
        }

        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();

        if (attrs != null) {
            HttpServletRequest req = attrs.getRequest();

            // Respect reverse-proxy header if present
            String xff = req.getHeader("X-Forwarded-For");
            String ip = (xff != null && !xff.isBlank())
                    ? xff.split(",")[0].trim()
                    : req.getRemoteAddr();

            return "ip:" + ip;
        }

        // Should never happen in a web request, but keep it deterministic
        return "anonymous";
    }
}
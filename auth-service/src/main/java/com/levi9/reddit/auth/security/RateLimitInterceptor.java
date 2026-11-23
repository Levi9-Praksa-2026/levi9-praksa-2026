package com.levi9.reddit.auth.security;

import com.levi9.reddit.auth.exception.TooManyRequestsException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Limits how often one client IP may call an MVC endpoint (register), so nobody can check many emails quickly.
 * Runs before the request body is read and validated: a blocked request costs no BCrypt, and invalid requests count.
 */
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
class RateLimitInterceptor implements HandlerInterceptor {
    private final RateLimiter limiter;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        limiter.tryAcquire(request.getRemoteAddr()).ifPresent(wait -> {
            // Handled like any domain error by GlobalExceptionHandler: 429 problem detail plus Retry-After.
            throw new TooManyRequestsException(wait);
        });
        return true;
    }
}

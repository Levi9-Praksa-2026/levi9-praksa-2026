package com.levi9.reddit.auth.security;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

/**
 * Rate limits per client IP, bound from {@code app.rate-limit.*} and validated at startup.
 * Values: workspace DECISIONS.md (2026-11-18).
 */
@Validated
@ConfigurationProperties(prefix = "app.rate-limit")
public record RateLimitProperties(
        @NotNull @Valid Limit login,
        @NotNull @Valid Limit register) {

    /**
     * At most {@code requests} per {@code per}. Refilled gradually, not all at once: one request comes back every
     * {@code per / requests} (10 per minute = one every 6 seconds).
     */
    public record Limit(@Positive int requests, @NotNull Duration per) {
    }
}

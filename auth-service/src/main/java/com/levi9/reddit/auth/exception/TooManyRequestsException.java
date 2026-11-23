package com.levi9.reddit.auth.exception;

import java.time.Duration;
import java.util.Objects;

/** Too many attempts from one client in a short time (rate limit). Becomes {@code 429} with {@code Retry-After}. */
public final class TooManyRequestsException extends DomainException {
    private final Duration retryAfter;

    public TooManyRequestsException(Duration retryAfter) {
        super(ErrorType.RATE_LIMITED, "Too many attempts, please try again later");
        this.retryAfter = Objects.requireNonNull(retryAfter, "retryAfter");
    }

    /** How long until the next attempt would be allowed. */
    public Duration getRetryAfter() {
        return retryAfter;
    }
}

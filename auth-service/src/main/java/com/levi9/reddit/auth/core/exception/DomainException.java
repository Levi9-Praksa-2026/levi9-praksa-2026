package com.levi9.reddit.auth.core.exception;

import java.util.Objects;

/**
 * An expected failure a correctly behaving client can cause. Translated to a 4xx by the API layer.
 * Unchecked on purpose: {@code @Transactional} rolls back on runtime exceptions and commits on checked ones.
 */
public abstract class DomainException extends RuntimeException {
    private final ErrorType errorType;

    protected DomainException(ErrorType errorType, String detail) {
        super(detail);
        this.errorType = Objects.requireNonNull(errorType, "errorType");
    }

    public ErrorType getErrorType() {
        return errorType;
    }
}

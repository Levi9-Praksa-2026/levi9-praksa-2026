package com.levi9.reddit.auth.exception;

import java.util.Objects;

/**
 * An expected failure a correctly behaving client can cause. Translated to a 4xx by the API layer.
 * Unchecked on purpose: {@code @Transactional} rolls back on runtime exceptions and commits on checked ones.
 * Sealed so the API layer's status mapping is checked by the compiler: a new subtype must be added to
 * {@code permits}, and every exhaustive switch over it then fails to compile until it is mapped.
 */
public abstract sealed class DomainException extends RuntimeException
        permits UnauthorizedException, ForbiddenException, ConflictException, NotFoundException,
        TooManyRequestsException {
    private final ErrorType errorType;

    protected DomainException(ErrorType errorType, String detail) {
        super(detail);
        this.errorType = Objects.requireNonNull(errorType, "errorType");
    }

    public ErrorType getErrorType() {
        return errorType;
    }
}

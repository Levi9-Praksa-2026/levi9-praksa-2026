package com.levi9.reddit.post.exception;

import java.util.Objects;
import lombok.Getter;

/**
 * An expected failure a correct client can cause. The subtype decides the HTTP status (see
 * {@code GlobalExceptionHandler}); unchecked, so {@code @Transactional} rolls back on it.
 */
public abstract sealed class DomainException extends RuntimeException
        permits NotFoundException, ForbiddenException, ValidationException {
    @Getter
    private final ErrorType errorType;

    protected DomainException(ErrorType errorType, String detail) {
        super(detail);
        this.errorType = Objects.requireNonNull(errorType, "errorType");
    }
}

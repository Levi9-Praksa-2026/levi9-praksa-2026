package com.levi9.reddit.post.exception;

import java.util.Objects;
import lombok.Getter;

/**
 * An expected failure a correct client can cause, or one it can retry (a dependency is down). The subtype decides
 * the HTTP status (see {@code GlobalExceptionHandler}); unchecked, so {@code @Transactional} rolls back on it.
 */
public abstract sealed class DomainException extends RuntimeException
        permits NotFoundException, ForbiddenException, ValidationException, ServiceUnavailableException {
    @Getter
    private final ErrorType errorType;

    protected DomainException(ErrorType errorType, String detail) {
        this(errorType, detail, null);
    }

    protected DomainException(ErrorType errorType, String detail, Throwable cause) {
        super(detail, cause);
        this.errorType = Objects.requireNonNull(errorType, "errorType");
    }
}

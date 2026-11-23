package com.levi9.reddit.community.exception;

import lombok.Getter;

import java.util.Objects;

@Getter
public abstract sealed class DomainException extends RuntimeException
        permits NotFoundException, ConflictException {
    private final ErrorType errorType;

    protected DomainException(ErrorType errorType, String detail) {
        super(detail);
        this.errorType = Objects.requireNonNull(errorType, "errorType");
    }
}

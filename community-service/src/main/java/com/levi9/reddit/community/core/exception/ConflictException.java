package com.levi9.reddit.community.core.exception;

public final class ConflictException extends DomainException {
    public ConflictException(ErrorType errorType, String detail) {
        super(errorType, detail);
    }
}

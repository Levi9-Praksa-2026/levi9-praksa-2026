package com.levi9.reddit.auth.core.exception;

public final class NotFoundException extends DomainException {
    public NotFoundException(ErrorType errorType, String detail) {
        super(errorType, detail);
    }
}

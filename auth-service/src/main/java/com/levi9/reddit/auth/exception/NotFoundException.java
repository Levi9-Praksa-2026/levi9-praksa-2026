package com.levi9.reddit.auth.exception;

public final class NotFoundException extends DomainException {
    public NotFoundException(ErrorType errorType, String detail) {
        super(errorType, detail);
    }
}

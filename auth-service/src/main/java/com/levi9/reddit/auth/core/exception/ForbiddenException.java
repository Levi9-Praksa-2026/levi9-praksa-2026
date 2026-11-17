package com.levi9.reddit.auth.core.exception;

public class ForbiddenException extends DomainException {
    public ForbiddenException(ErrorType errorType, String detail) {
        super(errorType, detail);
    }
}

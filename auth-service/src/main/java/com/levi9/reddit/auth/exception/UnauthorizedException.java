package com.levi9.reddit.auth.exception;

public final class UnauthorizedException extends DomainException {
    public UnauthorizedException(ErrorType errorType, String detail) {
        super(errorType, detail);
    }
}

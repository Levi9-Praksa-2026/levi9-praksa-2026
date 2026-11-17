package com.levi9.reddit.auth.core.exception;

public class UnauthorizedException extends DomainException {
    public UnauthorizedException(ErrorType errorType, String detail) {
        super(errorType, detail);
    }
}

package com.levi9.reddit.auth.exception;

public sealed class ForbiddenException extends DomainException permits UserBannedException {
    public ForbiddenException(ErrorType errorType, String detail) {
        super(errorType, detail);
    }
}

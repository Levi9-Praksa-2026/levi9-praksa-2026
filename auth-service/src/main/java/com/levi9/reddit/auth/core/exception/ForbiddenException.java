package com.levi9.reddit.auth.core.exception;

public sealed class ForbiddenException extends DomainException permits UserBannedException {
    public ForbiddenException(ErrorType errorType, String detail) {
        super(errorType, detail);
    }
}

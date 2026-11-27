package com.levi9.reddit.post.exception;

/** 400: a well-formed request combines parameters that cannot be used together. */
public final class BadRequestException extends DomainException {
    public BadRequestException(ErrorType errorType, String detail) {
        super(errorType, detail);
    }
}

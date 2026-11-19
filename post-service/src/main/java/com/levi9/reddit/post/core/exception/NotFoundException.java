package com.levi9.reddit.post.core.exception;

/** 404. */
public sealed class NotFoundException extends DomainException permits PostNotFoundException {
    public NotFoundException(ErrorType errorType, String detail) {
        super(errorType, detail);
    }
}

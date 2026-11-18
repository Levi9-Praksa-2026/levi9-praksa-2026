package com.levi9.reddit.community.core.exception;

public sealed class NotFoundException extends DomainException permits CommunityNotFoundException {
    public NotFoundException(ErrorType errorType, String detail) {
        super(errorType, detail);
    }
}

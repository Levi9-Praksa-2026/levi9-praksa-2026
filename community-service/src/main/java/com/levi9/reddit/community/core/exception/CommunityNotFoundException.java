package com.levi9.reddit.community.core.exception;

public final class CommunityNotFoundException extends NotFoundException {
    public CommunityNotFoundException(String name) {
        super(ErrorType.COMMUNITY_NOT_FOUND, "Community not found: " + name);
    }
}

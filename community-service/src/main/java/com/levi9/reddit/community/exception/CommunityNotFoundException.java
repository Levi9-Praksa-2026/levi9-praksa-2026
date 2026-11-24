package com.levi9.reddit.community.exception;

public final class CommunityNotFoundException extends NotFoundException {
    public CommunityNotFoundException(String name) {
        super(ErrorType.COMMUNITY_NOT_FOUND, "Community not found: " + name);
    }

    public CommunityNotFoundException(long id) {
        super(ErrorType.COMMUNITY_NOT_FOUND, "Community not found by id: " + id);
    }
}

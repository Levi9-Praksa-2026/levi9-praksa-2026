package com.levi9.reddit.post.exception;

/**
 * community-service did not answer the community or membership check. The post is refused (fail closed) rather than
 * accepted unchecked.
 */
public final class CommunityServiceUnavailableException extends ServiceUnavailableException {
    public CommunityServiceUnavailableException(Throwable cause) {
        super(ErrorType.COMMUNITY_SERVICE_UNAVAILABLE,
                "Communities can't be checked right now. Please try again shortly", cause);
    }
}

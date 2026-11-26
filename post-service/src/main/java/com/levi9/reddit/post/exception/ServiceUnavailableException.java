package com.levi9.reddit.post.exception;

/**
 * 503. A service post-service depends on could not answer (down, timed out or failed), so the request could not be
 * checked. Not the client's fault and worth retrying; the cause goes to the log, never into {@code detail}.
 */
public sealed class ServiceUnavailableException extends DomainException
        permits CommunityServiceUnavailableException {
    public ServiceUnavailableException(ErrorType errorType, String detail, Throwable cause) {
        super(errorType, detail, cause);
    }
}

package com.levi9.reddit.auth.core.exception;

/**
 * Stable error codes sent to clients as the {@code errorType} problem-detail extension.
 * Part of the API contract: renaming a value is a breaking change for the frontend.
 */
public enum ErrorType {
    INVALID_CREDENTIALS,
    INVALID_REFRESH_TOKEN,
    USERNAME_TAKEN,
    /** Only for changing the email on an authenticated profile, after the current password is checked. Register never sends it. */
    EMAIL_TAKEN,
    /** Register failed for a reason that must not be named, e.g. a taken email. Never "email taken". */
    REGISTRATION_FAILED,
    /** The refresh token was rotated seconds ago by another request: use the tokens that one received. */
    REFRESH_IN_PROGRESS,
    /** Too many login or register attempts from one client IP. The {@code Retry-After} header says when to retry. */
    RATE_LIMITED,
    USER_BANNED,
    USER_NOT_FOUND,
    ACCOUNT_DELETION_FORBIDDEN
}

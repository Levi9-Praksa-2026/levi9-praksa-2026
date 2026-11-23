package com.levi9.reddit.auth.exception;

import lombok.Getter;

/** Login or refresh by a banned user. Thrown only after the password has been verified. */
@Getter
public final class UserBannedException extends ForbiddenException {
    private final String banReason; // nullable: a ban is not required to have a reason

    public UserBannedException(String banReason) {
        super(ErrorType.USER_BANNED, "This account is banned");
        this.banReason = banReason;
    }
}

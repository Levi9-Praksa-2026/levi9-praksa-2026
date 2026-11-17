package com.levi9.reddit.auth.core.exception;

/** Login or refresh by a banned user. Thrown only after the password has been verified. */
public class UserBannedException extends ForbiddenException {
    private final String banReason; // nullable: a ban is not required to have a reason

    public UserBannedException(String banReason) {
        super(ErrorType.USER_BANNED, "This account is banned");
        this.banReason = banReason;
    }

    public String getBanReason() {
        return banReason;
    }
}

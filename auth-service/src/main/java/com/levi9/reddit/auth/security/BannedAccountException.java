package com.levi9.reddit.auth.security;

import lombok.Getter;
import org.springframework.security.authentication.LockedException;

/**
 * A ban, found after the password was proven right (see {@link AuthenticationConfig}). Carries the reason, so the
 * login can tell the user why. Thrown only with the right password, so it reveals nothing to someone guessing.
 */
@Getter
public class BannedAccountException extends LockedException {
    /** The admin's reason; null if none was recorded. */
    private final String banReason;

    public BannedAccountException(String banReason) {
        super("Account is banned");
        this.banReason = banReason;
    }
}

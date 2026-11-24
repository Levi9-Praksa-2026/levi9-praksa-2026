package com.levi9.reddit.auth.service;

import com.levi9.reddit.auth.entity.User;
import com.levi9.reddit.auth.entity.UserRole;
import com.levi9.reddit.auth.exception.ConflictException;
import com.levi9.reddit.auth.exception.ErrorType;
import com.levi9.reddit.auth.exception.ForbiddenException;
import com.levi9.reddit.auth.exception.NotFoundException;
import com.levi9.reddit.auth.repository.UserRepository;
import com.levi9.reddit.auth.security.AuthorizationRevoker;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Admin ban and unban. A ban ends every login of the user at once: their authorizations are deleted, so the gateway's
 * next refresh fails and its session ends; auth-service also refuses any new token for a banned user
 * ({@code TokenClaims}). The access token already in a session stays valid until it expires, at most 15 minutes.
 * An unban brings no session back: the user logs in again.
 */
@Service
@RequiredArgsConstructor
public class UserBanService {
    private final UserRepository users;
    private final AuthorizationRevoker authorizations;

    @Transactional
    public void ban(String username, Long adminId, String reason) {
        User user = findActive(username);
        if (user.getRole() == UserRole.ADMIN) {
            throw new ForbiddenException(ErrorType.ADMIN_BAN_FORBIDDEN, "Admins cannot be banned");
        }
        if (user.isBanned()) {
            throw new ConflictException(ErrorType.USER_ALREADY_BANNED, "User is already banned");
        }
        user.ban(adminId, reason.strip(), Instant.now());
        authorizations.revokeAllOf(user.getId());
    }

    @Transactional
    public void unban(String username) {
        User user = findActive(username);
        if (!user.isBanned()) {
            throw new ConflictException(ErrorType.USER_NOT_BANNED, "User is not banned");
        }
        user.unban();
    }

    private User findActive(String username) {
        return users.findByUsernameIgnoringCase(username)
                .filter(user -> !user.isDeleted())
                .orElseThrow(() -> new NotFoundException(ErrorType.USER_NOT_FOUND, "User not found"));
    }
}

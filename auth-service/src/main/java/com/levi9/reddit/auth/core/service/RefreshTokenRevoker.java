package com.levi9.reddit.auth.core.service;

import com.levi9.reddit.auth.infrastructure.repository.RefreshTokenRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Revokes all of a user's refresh tokens in a transaction of its own, which commits even when the caller then
 * fails. Used when a stolen refresh token is detected: refresh answers 401, and that exception rolls back the
 * caller's transaction, but the revocation must stay.
 * <p>
 * A separate bean on purpose: {@code @Transactional} works through a Spring proxy, so a method calling another
 * method on the same object would skip the new transaction.
 */
@Component
public class RefreshTokenRevoker {
    private final RefreshTokenRepository refreshTokens;

    public RefreshTokenRevoker(RefreshTokenRepository refreshTokens) {
        this.refreshTokens = refreshTokens;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int revokeAllOf(Long userId, Instant at) {
        return refreshTokens.revokeAllActiveByUserId(userId, at);
    }
}

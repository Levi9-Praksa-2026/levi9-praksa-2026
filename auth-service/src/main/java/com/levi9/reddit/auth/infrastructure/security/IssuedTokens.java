package com.levi9.reddit.auth.infrastructure.security;

import java.time.Instant;

/**
 * A freshly issued token pair. Internal only, never returned to a client as is: it carries the
 * refresh token's hash, which is what gets stored, next to the raw value, which only the client gets.
 */
public record IssuedTokens(
        String accessToken,
        Instant accessTokenExpiresAt,
        String refreshToken,
        String refreshTokenHash,
        Instant refreshTokenExpiresAt) {
}

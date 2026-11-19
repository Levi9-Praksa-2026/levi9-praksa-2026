package com.levi9.reddit.auth.contracts;

/**
 * Returned by register, login and refresh. The client sends {@code accessToken} as
 * {@code Authorization: Bearer <accessToken>} on every request, and {@code refreshToken} only to
 * {@code POST /api/auth/refresh}. {@code expiresIn} is the access token's lifetime in seconds.
 */
public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn) {

    public static final String BEARER = "Bearer";

    public AuthResponse(String accessToken, String refreshToken, long expiresIn) {
        this(accessToken, refreshToken, BEARER, expiresIn);
    }
}

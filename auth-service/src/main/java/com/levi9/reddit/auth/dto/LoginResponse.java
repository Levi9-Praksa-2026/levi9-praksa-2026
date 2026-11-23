package com.levi9.reddit.auth.dto;

/** Body of a successful {@code POST /api/auth/login}: where the browser goes next (a full-page navigation). */
public record LoginResponse(String redirectUrl) {
}

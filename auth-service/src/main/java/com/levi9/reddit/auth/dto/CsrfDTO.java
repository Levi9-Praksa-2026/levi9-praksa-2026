package com.levi9.reddit.auth.dto;

/** Body of {@code GET /api/auth/csrf}: send {@code token} in the {@code headerName} header on login and register. */
public record CsrfDTO(String headerName, String token) {
}

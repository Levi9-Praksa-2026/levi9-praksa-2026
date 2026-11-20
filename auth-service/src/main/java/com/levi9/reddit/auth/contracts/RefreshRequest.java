package com.levi9.reddit.auth.contracts;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body of {@code POST /api/auth/refresh}: the refresh token from the last login or refresh. */
public record RefreshRequest(
        @NotBlank @Size(max = 128)
        String refreshToken) {
}

package com.levi9.reddit.auth.contracts;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code POST /api/auth/login}. Login is by email. The password has no minimum here on purpose:
 * login never tells the caller anything about the password rules, it only checks the hash. The maximums
 * keep oversized input away from the password hasher.
 */
public record LoginRequest(
        @NotBlank @Size(max = 254)
        String email,

        @NotBlank @Size(max = 128)
        String password) {
}

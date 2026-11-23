package com.levi9.reddit.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code POST /api/auth/register}. Rules from the 2026-11-18 decisions:
 * username 3-30 letters, digits or {@code _}; password at least 12 characters of any kind (OWASP ASVS V2.1),
 * no composition rules, and at most 72 bytes because passwords are hashed with BCrypt.
 * Lengths match the {@code auth.users} columns.
 */
public record RegisterRequest(
        @NotBlank
        @Pattern(regexp = "^[A-Za-z0-9_]{3,30}$", message = "must be 3 to 30 letters, digits or underscores")
        String username,

        @NotBlank @Email @Size(max = 254)
        String email,

        @NotBlank @Size(min = 12) @MaxUtf8Bytes(72)
        String password,

        @NotBlank @Size(max = 50)
        String firstName,

        @NotBlank @Size(max = 50)
        String lastName) {
}

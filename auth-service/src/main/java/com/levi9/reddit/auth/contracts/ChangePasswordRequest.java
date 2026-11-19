package com.levi9.reddit.auth.contracts;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.nio.charset.StandardCharsets;

public record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 12, message = "New password must be at least 12 characters") String newPassword) {
    private static final int BCRYPT_MAX_BYTES = 72;

    @AssertTrue(message = "Current password must be at most 72 UTF-8 bytes")
    public boolean isCurrentPasswordWithinBcryptLimit() {
        return withinBcryptLimit(currentPassword);
    }

    @AssertTrue(message = "New password must be at most 72 UTF-8 bytes")
    public boolean isNewPasswordWithinBcryptLimit() {
        return withinBcryptLimit(newPassword);
    }

    @AssertTrue(message = "New password must differ from the current password")
    public boolean isNewPasswordDifferent() {
        return newPassword == null || !newPassword.equals(currentPassword);
    }

    private static boolean withinBcryptLimit(String password) {
        return password == null || (password.length() <= BCRYPT_MAX_BYTES
                && password.getBytes(StandardCharsets.UTF_8).length <= BCRYPT_MAX_BYTES);
    }

    @Override
    public String toString() {
        return "ChangePasswordRequest[passwords redacted]";
    }
}

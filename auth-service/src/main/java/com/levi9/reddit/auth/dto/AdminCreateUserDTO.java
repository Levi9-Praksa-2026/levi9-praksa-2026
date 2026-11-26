package com.levi9.reddit.auth.dto;

import com.levi9.reddit.auth.entity.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Role selection belongs only to the protected admin endpoint, never public registration. */
public record AdminCreateUserDTO(
        @NotBlank @Pattern(regexp = "^[A-Za-z0-9_]{3,30}$", message = "must be 3 to 30 letters, digits or underscores") String username,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 12) @MaxUtf8Bytes(72) String password,
        @NotBlank @Size(max = 50) String firstName,
        @NotBlank @Size(max = 50) String lastName,
        UserRole role) {
    public AdminCreateUserDTO {
        // Preserve the original regular-user behavior for clients that omit the new field.
        role = role == null ? UserRole.USER : role;
    }

    public RegisterDTO registration() {
        return new RegisterDTO(username, email, password, firstName, lastName);
    }
}

package com.levi9.reddit.auth.dto;

import com.levi9.reddit.auth.entity.UserRole;
import java.time.Instant;

/** Directory details for administrators. Never includes password hashes or authorization data. */
public record AdminUserDTO(Long id, String username, String email, String firstName, String lastName,
        UserRole role, boolean banned, boolean deleted, String banReason, Instant bannedAt, Instant createdAt) {}

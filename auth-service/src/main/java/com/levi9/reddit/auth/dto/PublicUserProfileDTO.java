package com.levi9.reddit.auth.dto;

import java.time.Instant;

/** Public identity only; account credentials and email are private. */
public record PublicUserProfileDTO(String username, String firstName, String lastName, Instant createdAt) {}

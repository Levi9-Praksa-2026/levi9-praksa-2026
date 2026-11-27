package com.levi9.reddit.community.dto;

import java.time.Instant;

public record CommunityDetailDTO(
        Long id,
        String name,
        String description,
        int memberCount,
        Instant createdAt,
        boolean active) {
}

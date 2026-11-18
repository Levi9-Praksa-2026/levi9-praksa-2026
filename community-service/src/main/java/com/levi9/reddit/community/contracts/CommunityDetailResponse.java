package com.levi9.reddit.community.contracts;

import java.time.Instant;

public record CommunityDetailResponse(
        Long id,
        String name,
        String description,
        int memberCount,
        Instant createdAt) {
}

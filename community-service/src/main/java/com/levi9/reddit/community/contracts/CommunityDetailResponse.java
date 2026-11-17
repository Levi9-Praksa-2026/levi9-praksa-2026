package com.levi9.reddit.community.contracts;

import java.time.Instant;
import java.util.List;

public record CommunityDetailResponse(
        Long id,
        String name,
        String description,
        Long creatorId,
        int memberCount,
        Instant createdAt,
        List<PostResponse> posts) {
}

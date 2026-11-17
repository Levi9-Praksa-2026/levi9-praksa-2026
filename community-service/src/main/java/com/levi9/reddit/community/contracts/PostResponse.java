package com.levi9.reddit.community.contracts;

import java.time.Instant;

public record PostResponse(
        Long id,
        String title,
        String content,
        Long authorId,
        String authorUsername,
        Long communityId,
        int score,
        int commentCount,
        Instant createdAt,
        Instant updatedAt) {
}

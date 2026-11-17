package com.levi9.reddit.post.contracts;

import java.time.Instant;

public record CommentResponse(
        Long id,
        Long postId,
        Long authorId,
        String authorUsername,
        String content,
        int score,
        Instant createdAt) {
}

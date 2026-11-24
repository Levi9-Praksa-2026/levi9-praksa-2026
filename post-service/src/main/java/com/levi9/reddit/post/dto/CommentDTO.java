package com.levi9.reddit.post.dto;

import java.time.Instant;

public record CommentDTO(
        Long id,
        Long postId,
        Long authorId,
        String authorUsername,
        String content,
        int score,
        Instant createdAt) {
}

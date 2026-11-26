package com.levi9.reddit.post.dto;

import java.time.Instant;
import java.util.List;

/**
 * @param communityName the community's name when the post was written (names never change); null on posts
 *                      created before the name was stored
 * @param images        up to three, in upload order; empty (never null) for a post without images
 */
public record PostDTO(
        Long id,
        String title,
        String content,
        Long authorId,
        String authorUsername,
        Long communityId,
        String communityName,
        int score,
        int commentCount,
        Instant createdAt,
        Instant updatedAt,
        List<PostImageDTO> images) {

    public PostDTO {
        images = images == null ? List.of() : List.copyOf(images);
    }
}

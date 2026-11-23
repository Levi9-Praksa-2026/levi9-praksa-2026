package com.levi9.reddit.post.dto;

/**
 * One image of a post.
 *
 * @param url relative URL of the image file ({@code /api/posts/{postId}/images/{id}}), served by post-service
 *            itself so the bucket stays private; use it directly as an {@code <img src>}
 */
public record PostImageDTO(Long id, String url) {
}

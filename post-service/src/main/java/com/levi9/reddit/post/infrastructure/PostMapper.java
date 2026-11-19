package com.levi9.reddit.post.infrastructure;

import com.levi9.reddit.post.contracts.PostResponse;
import com.levi9.reddit.post.core.model.Post;

/** Entity to contract mapping shared by the query and command services. */
final class PostMapper {

    private PostMapper() {}

    static PostResponse toResponse(Post post) {
        return new PostResponse(
                post.getId(),
                post.getTitle(),
                post.getContent(),
                post.getAuthorId(),
                post.getAuthorUsername(),
                post.getCommunityId(),
                post.getScore(),
                post.getCommentCount(),
                post.getCreatedAt(),
                post.getUpdatedAt());
    }
}

package com.levi9.reddit.post.core.exception;

/** The post does not exist or was removed. Both look the same to a caller. */
public class PostNotFoundException extends RuntimeException {

    public PostNotFoundException(Long postId) {
        super("Post not found: " + postId);
    }
}

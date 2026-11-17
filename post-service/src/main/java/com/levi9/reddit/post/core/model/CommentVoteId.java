package com.levi9.reddit.post.core.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class CommentVoteId implements Serializable {
    @Column(name = "comment_id", nullable = false)
    private Long commentId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    protected CommentVoteId() {}

    public CommentVoteId(Long commentId, Long userId) {
        this.commentId = Objects.requireNonNull(commentId);
        this.userId = Objects.requireNonNull(userId);
    }

    public Long getCommentId() {
        return commentId;
    }

    public Long getUserId() {
        return userId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof CommentVoteId that)) {
            return false;
        }
        return Objects.equals(commentId, that.commentId) && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(commentId, userId);
    }
}

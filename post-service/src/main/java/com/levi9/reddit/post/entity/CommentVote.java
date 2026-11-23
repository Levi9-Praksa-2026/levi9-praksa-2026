package com.levi9.reddit.post.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "comment_votes")
public class CommentVote {
    @EmbeddedId
    private CommentVoteId id;
    @Column(nullable = false)
    private short value;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected CommentVote() {}

    public CommentVote(CommentVoteId id, short value) {
        this.id = Objects.requireNonNull(id);
        setValue(value);
    }

    public CommentVoteId getId() {
        return id;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public short getValue() {
        return value;
    }
    public void setValue(short value) {
        if (value != -1 && value != 1) {
            throw new IllegalArgumentException("Vote must be -1 or 1");
        }
        this.value = value;
    }
}

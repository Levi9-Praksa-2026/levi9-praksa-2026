package com.levi9.reddit.post.core.model;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "post_votes")
public class PostVote {
    @EmbeddedId
    private PostVoteId id;
    @Column(nullable = false)
    private short value;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected PostVote() {}

    public PostVote(PostVoteId id, short value) {
        this.id = Objects.requireNonNull(id);
        setValue(value);
    }

    public PostVoteId getId() {
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

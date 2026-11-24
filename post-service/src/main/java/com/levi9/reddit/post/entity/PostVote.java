package com.levi9.reddit.post.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "post_votes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PostVote {
    @EmbeddedId
    private PostVoteId id;
    @Column(nullable = false)
    private short value;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public PostVote(PostVoteId id, short value) {
        this.id = Objects.requireNonNull(id);
        setValue(value);
    }

    public void setValue(short value) {
        if (value != -1 && value != 1) {
            throw new IllegalArgumentException("Vote must be -1 or 1");
        }
        this.value = value;
    }
}

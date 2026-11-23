package com.levi9.reddit.post.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "comments")
public class Comment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "post_id", nullable = false, updatable = false)
    private Long postId;

    @Column(name = "author_id", nullable = false, updatable = false)
    private Long authorId;

    @Column(name = "author_username", nullable = false, length = 30)
    private String authorUsername;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @Column(nullable = false)
    private int score;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "removed_at")
    private Instant removedAt;

    @Column(name = "removed_by")
    private Long removedBy;

    protected Comment() {}

    public Comment(Long postId, Long authorId, String authorUsername, String content) {
        this.postId = Objects.requireNonNull(postId, "postId");
        this.authorId = Objects.requireNonNull(authorId, "authorId");
        this.authorUsername = Objects.requireNonNull(authorUsername, "authorUsername");
        this.content = Objects.requireNonNull(content, "content");
    }

    public Long getId() {
        return id;
    }

    public Long getPostId() {
        return postId;
    }

    public Long getAuthorId() {
        return authorId;
    }

    public String getAuthorUsername() {
        return authorUsername;
    }

    public String getContent() {
        return content;
    }

    public int getScore() {
        return score;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getRemovedAt() {
        return removedAt;
    }

    public Long getRemovedBy() {
        return removedBy;
    }

    public void updateScore(int score) {
        this.score = score;
    }

    public void remove(Long userId, Instant at) {
        Instant removedAt = Objects.requireNonNull(at, "at");
        this.removedBy = Objects.requireNonNull(userId, "userId");
        this.removedAt = removedAt;
    }
}

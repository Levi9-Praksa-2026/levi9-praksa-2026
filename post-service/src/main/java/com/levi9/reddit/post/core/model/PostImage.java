package com.levi9.reddit.post.core.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "post_images")
public class PostImage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "post_id", nullable = false, updatable = false)
    private Long postId;

    @Column(name = "s3_key", nullable = false, length = 512)
    private String s3Key;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected PostImage() {}

    public PostImage(Long postId, String s3Key) {
        this.postId = Objects.requireNonNull(postId, "postId");
        this.s3Key = Objects.requireNonNull(s3Key, "s3Key");
    }

    public Long getId() {
        return id;
    }

    public Long getPostId() {
        return postId;
    }

    public String getS3Key() {
        return s3Key;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

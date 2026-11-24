package com.levi9.reddit.post.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "post_images")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PostImage {
    @Getter
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false, updatable = false)
    private Post post;

    @Getter
    @Column(name = "s3_key", nullable = false, length = 512)
    private String s3Key;

    @Getter
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    PostImage(Post post, String s3Key) {
        this.post = Objects.requireNonNull(post, "post");
        this.s3Key = Objects.requireNonNull(s3Key, "s3Key");
    }

    void detachFromPost() {
        post = null;
    }
}

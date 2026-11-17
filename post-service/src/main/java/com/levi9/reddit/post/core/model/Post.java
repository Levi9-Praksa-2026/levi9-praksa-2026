package com.levi9.reddit.post.core.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Entity
@Table(name = "posts")
public class Post {
    private static final int MAX_IMAGES = 3;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(columnDefinition = "text")
    private String content;

    @Column(name = "author_id", nullable = false, updatable = false)
    private Long authorId;

    @Column(name = "author_username", nullable = false, length = 30)
    private String authorUsername;

    @Column(name = "community_id", nullable = false, updatable = false)
    private Long communityId;

    @Column(nullable = false)
    private int score;

    @Column(name = "comment_count", nullable = false)
    private int commentCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "removed_at")
    private Instant removedAt;

    @Column(name = "removed_by")
    private Long removedBy;

    @OneToMany(mappedBy = "post", cascade = CascadeType.PERSIST, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<PostImage> images = new ArrayList<>();

    protected Post() {}

    public Post(String title, Long authorId, String authorUsername, Long communityId) {
        this.title = Objects.requireNonNull(title, "title");
        this.authorId = Objects.requireNonNull(authorId, "authorId");
        this.authorUsername = Objects.requireNonNull(authorUsername, "authorUsername");
        this.communityId = Objects.requireNonNull(communityId, "communityId");
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }

    public Long getAuthorId() {
        return authorId;
    }

    public String getAuthorUsername() {
        return authorUsername;
    }

    public Long getCommunityId() {
        return communityId;
    }

    public int getScore() {
        return score;
    }

    public int getCommentCount() {
        return commentCount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getRemovedAt() {
        return removedAt;
    }

    public Long getRemovedBy() {
        return removedBy;
    }

    public List<PostImage> getImages() {
        return List.copyOf(images);
    }

    public PostImage addImage(String s3Key) {
        if (images.size() >= MAX_IMAGES) {
            throw new IllegalStateException("A post can have at most three images");
        }
        PostImage image = new PostImage(this, s3Key);
        images.add(image);
        return image;
    }

    public void removeImage(PostImage image) {
        if (images.remove(image)) {
            image.detachFromPost();
        }
    }

    public void edit(String title, String content, Instant at) {
        Instant updatedAt = Objects.requireNonNull(at, "at");
        this.title = Objects.requireNonNull(title, "title");
        this.updatedAt = updatedAt;
        this.content = content;
    }

    public void updateScore(int score) {
        this.score = score;
    }

    public void updateCommentCount(int count) {
        if (count < 0) {
            throw new IllegalArgumentException("Comment count cannot be negative");
        }
        this.commentCount = count;
    }

    public void remove(Long userId, Instant at) {
        Instant removedAt = Objects.requireNonNull(at, "at");
        this.removedBy = Objects.requireNonNull(userId, "userId");
        this.removedAt = removedAt;
    }
}

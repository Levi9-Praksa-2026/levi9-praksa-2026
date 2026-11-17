package com.levi9.reddit.community.core.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "communities")
public class Community {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "creator_id", nullable = false, updatable = false)
    private Long creatorId;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "member_count", nullable = false)
    private int memberCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Community() {}

    public Community(String name, Long creatorId) {
        this.name = Objects.requireNonNull(name, "name");
        this.creatorId = Objects.requireNonNull(creatorId, "creatorId");
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public Long getCreatorId() {
        return creatorId;
    }

    public boolean isActive() {
        return active;
    }

    public int getMemberCount() {
        return memberCount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void updateDescription(String description) {
        this.description = description;
    }

    public void deactivate() {
        this.active = false;
    }

    public void updateMemberCount(int count) {
        if (count < 0) {
            throw new IllegalArgumentException("Member count cannot be negative");
        }
        this.memberCount = count;
    }
}

package com.levi9.reddit.community.core.model;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "community_members")
public class CommunityMember {
    @EmbeddedId
    private CommunityMemberId id;
    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt = Instant.now();

    protected CommunityMember() {}

    public CommunityMember(CommunityMemberId id) {
        this.id = Objects.requireNonNull(id);
    }

    public CommunityMemberId getId() {
        return id;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }
}

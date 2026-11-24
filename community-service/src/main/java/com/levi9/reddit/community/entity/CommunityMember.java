package com.levi9.reddit.community.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;

import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "community_members")
@Getter
public class CommunityMember {
    @EmbeddedId
    private CommunityMemberId id;
    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt = Instant.now();

    protected CommunityMember() {}

    public CommunityMember(CommunityMemberId id) {
        this.id = Objects.requireNonNull(id);
    }
}

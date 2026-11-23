package com.levi9.reddit.community.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class CommunityMemberId implements Serializable {
    @Column(name = "community_id", nullable = false)
    private Long communityId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    protected CommunityMemberId() {}

    public CommunityMemberId(Long communityId, Long userId) {
        this.communityId = Objects.requireNonNull(communityId);
        this.userId = Objects.requireNonNull(userId);
    }

    public Long getCommunityId() {
        return communityId;
    }

    public Long getUserId() {
        return userId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof CommunityMemberId that)) {
            return false;
        }
        return Objects.equals(communityId, that.communityId) && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(communityId, userId);
    }
}

package com.levi9.reddit.community.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.EqualsAndHashCode;
import lombok.Getter;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
@Getter
@EqualsAndHashCode
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
}

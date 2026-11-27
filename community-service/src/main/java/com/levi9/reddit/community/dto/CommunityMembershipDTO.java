package com.levi9.reddit.community.dto;

/** Whether the caller has joined a community, served only on the caller's own /members/me route. */
public record CommunityMembershipDTO(boolean joined) {
}

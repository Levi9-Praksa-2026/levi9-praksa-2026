package com.levi9.reddit.community.dto;

/**
 * Ordering of the community list, from the {@code sort} query parameter.
 *
 * <p>Both values use data owned by community-service. {@code HOT} needs activity from post-service's
 * {@code /internal/posts/community-activity} and will be added when that endpoint exists.
 */
public enum CommunitySort {
    NEW,
    TOP
}

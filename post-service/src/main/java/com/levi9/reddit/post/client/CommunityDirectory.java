package com.levi9.reddit.post.client;

/**
 * What post-service needs to know from community-service. Communities and memberships live there; post-service
 * only asks, it never reads that data itself.
 *
 * <p>{@link HttpCommunityDirectory} calls community-service's {@code GET /internal/communities/{id}} and
 * {@code GET /internal/communities/{id}/members/{userId}}.
 */
public interface CommunityDirectory {

    /**
     * The community exists and has not been shut down.
     *
     * @throws com.levi9.reddit.post.exception.CommunityServiceUnavailableException community-service did not answer
     */
    boolean isActive(long communityId);

    /**
     * The user has joined the community.
     *
     * @throws com.levi9.reddit.post.exception.CommunityServiceUnavailableException community-service did not answer
     */
    boolean isMember(long communityId, long userId);
}

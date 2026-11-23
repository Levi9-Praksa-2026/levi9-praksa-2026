package com.levi9.reddit.community.dto;

/**
 * One community in a list. Deliberately small: the detail endpoint carries the rest.
 * The name is the community's identifier in URLs.
 */
public record CommunityResponse(String name, int memberCount) {
}

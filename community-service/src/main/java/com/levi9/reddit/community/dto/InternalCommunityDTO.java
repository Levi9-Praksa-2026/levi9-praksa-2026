package com.levi9.reddit.community.dto;

/**
 * The community facts post-service needs before it accepts a post. Internal endpoints return this only for an
 * active community; a missing or inactive one is a 404.
 */
public record InternalCommunityDTO(String name, boolean active) {}

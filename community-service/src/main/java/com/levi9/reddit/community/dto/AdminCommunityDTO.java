package com.levi9.reddit.community.dto;

/** Admin list rows include state so mixed active/inactive pages expose the correct actions. */
public record AdminCommunityDTO(String name, int memberCount, boolean active) {}

package com.levi9.reddit.auth.contracts;

public record UserProfileResponse(Long id, String username, String email, String firstName, String lastName) {}

package com.levi9.reddit.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record DeleteUserRequest(@NotBlank String password) {}

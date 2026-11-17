package com.levi9.reddit.auth.contracts;

import jakarta.validation.constraints.NotBlank;

public record DeleteUserRequest(@NotBlank String password) {}

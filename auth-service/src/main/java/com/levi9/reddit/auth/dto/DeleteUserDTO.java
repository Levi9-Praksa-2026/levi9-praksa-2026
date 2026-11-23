package com.levi9.reddit.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record DeleteUserDTO(@NotBlank String password) {}

package com.levi9.reddit.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BanUserDTO(@NotBlank @Size(max = 500) String reason) {}

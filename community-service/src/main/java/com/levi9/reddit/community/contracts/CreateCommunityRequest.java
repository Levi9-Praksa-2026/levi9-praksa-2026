package com.levi9.reddit.community.contracts;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateCommunityRequest(
        @NotBlank
        @Size(max = 50)
        @Pattern(regexp = "[A-Za-z0-9_-]{1,50}", message = "must be a plain community name")
        String name,
        @Size(max = 2000) String description) {
}

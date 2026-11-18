package com.levi9.reddit.community.contracts;

import com.levi9.reddit.community.core.model.Community;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** The plain community name (no {@code r/} prefix — that is added by the frontend); description may be null or blank. */
public record CreateCommunityRequest(
        @NotBlank
        @Size(max = 50)
        @Pattern(regexp = Community.NAME_PATTERN, message = "must be a plain community name")
        String name,
        @Size(max = 2000) String description) {
}

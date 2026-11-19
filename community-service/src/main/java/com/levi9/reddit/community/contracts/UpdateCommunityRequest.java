package com.levi9.reddit.community.contracts;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** The community name is immutable, so the only editable field is the description. */
public record UpdateCommunityRequest(
        @NotNull @Size(max = 2000) String description) {
}

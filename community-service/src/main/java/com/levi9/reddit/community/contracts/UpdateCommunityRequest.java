package com.levi9.reddit.community.contracts;

import jakarta.validation.constraints.Size;

public record UpdateCommunityRequest(@Size(max = 2000) String description) {
}

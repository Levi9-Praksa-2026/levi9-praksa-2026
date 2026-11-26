package com.levi9.reddit.post.dto;

/** Time window for the top posts list: {@code GET /api/posts/top?period=}. */
public enum TopPeriod {
    /** Every visible post, ranked by score. */
    ALL,
    /** Only posts created in the last 7 days, ranked by score. */
    WEEK
}

package com.levi9.reddit.post.dto;

import java.util.List;

/**
 * One page of a list. Our own type instead of Spring's {@code Page}, so the JSON shape is stable
 * and doesn't change with a Spring Data upgrade.
 */
public record PageDTO<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages) {
}

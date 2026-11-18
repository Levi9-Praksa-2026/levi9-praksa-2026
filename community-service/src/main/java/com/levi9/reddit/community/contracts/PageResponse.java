package com.levi9.reddit.community.contracts;

import java.util.List;


public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages) {
}

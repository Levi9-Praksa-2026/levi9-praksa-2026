package com.levi9.reddit.community.infrastructure;

import com.levi9.reddit.community.contracts.CommunityDetailResponse;
import com.levi9.reddit.community.contracts.CommunityResponse;
import com.levi9.reddit.community.contracts.CommunitySort;
import com.levi9.reddit.community.contracts.PageResponse;
import com.levi9.reddit.community.core.exception.CommunityNotFoundException;
import com.levi9.reddit.community.core.model.Community;
import com.levi9.reddit.community.infrastructure.repository.CommunityRepository;
import java.util.function.Function;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CommunityService {
    // A second key breaks ties, so two rows with the same value never swap places between pages.
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
    private static final Sort MOST_MEMBERS_FIRST = Sort.by(Sort.Order.desc("memberCount"), Sort.Order.desc("id"));

    private final CommunityRepository communities;

    public CommunityService(CommunityRepository communities) {
        this.communities = communities;
    }

    /**
     * Active communities only.
     *
     * @param sort ordering, see {@link CommunitySort}
     * @param name only communities whose name contains this text, or {@code null}/blank for all
     */
    @Transactional(readOnly = true)
    public PageResponse<CommunityResponse> findCommunities(CommunitySort sort, String name, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, sortOf(sort));
        String filter = name == null || name.isBlank() ? null : name.strip();

        Page<Community> result = filter == null
                ? communities.findByActiveTrue(pageable)
                : communities.findByActiveTrueAndNameContainingIgnoreCase(filter, pageable);

        return toPage(result, community -> new CommunityResponse(community.getName(), community.getMemberCount()));
    }

    private static Sort sortOf(CommunitySort sort) {
        return switch (sort) {
            case NEW -> NEWEST_FIRST;
            case TOP -> MOST_MEMBERS_FIRST;
        };
    }

    @Transactional(readOnly = true)
    public CommunityDetailResponse getCommunity(String name) {
        Community community = communities.findActiveByName(name)
                .orElseThrow(() -> new CommunityNotFoundException(name));
        return new CommunityDetailResponse(
                community.getId(),
                community.getName(),
                community.getDescription(),
                community.getMemberCount(),
                community.getCreatedAt());
    }

    private static <E, R> PageResponse<R> toPage(Page<E> page, Function<E, R> mapper) {
        return new PageResponse<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages());
    }
}

package com.levi9.reddit.community.infrastructure;

import com.levi9.reddit.community.contracts.CommunityDetailResponse;
import com.levi9.reddit.community.contracts.CommunityResponse;
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
    // id breaks ties, so two rows with the same name never swap places between pages.
    private static final Sort BY_NAME = Sort.by(Sort.Order.asc("name"), Sort.Order.asc("id"));

    private final CommunityRepository communities;

    public CommunityService(CommunityRepository communities) {
        this.communities = communities;
    }

    @Transactional(readOnly = true)
    public PageResponse<CommunityResponse> findCommunities(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, BY_NAME);
        Page<Community> result = communities.findByActiveTrue(pageable);
        return toPage(result, community -> new CommunityResponse(community.getName(), community.getMemberCount()));
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

package com.levi9.reddit.community.infrastructure;

import com.levi9.reddit.community.contracts.CommunityDetailResponse;
import com.levi9.reddit.community.contracts.CommunityResponse;
import com.levi9.reddit.community.contracts.PageResponse;
import com.levi9.reddit.community.contracts.PostResponse;
import com.levi9.reddit.community.core.exception.CommunityNotFoundException;
import com.levi9.reddit.community.core.model.Community;
import com.levi9.reddit.community.infrastructure.repository.CommunityRepository;
import java.util.List;
import java.util.function.Function;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read-only queries for communities. Inactive communities are never returned. */
@Service
public class CommunityService {
    // id breaks ties, so two rows with the same name never swap places between pages.
    private static final Sort BY_NAME = Sort.by(Sort.Order.asc("name"), Sort.Order.asc("id"));

    private final CommunityRepository communities;
    private final PostServiceClient postService;

    public CommunityService(CommunityRepository communities, PostServiceClient postService) {
        this.communities = communities;
        this.postService = postService;
    }

    @Transactional(readOnly = true)
    public PageResponse<CommunityResponse> findCommunities(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, BY_NAME);
        Page<Community> result = communities.findByActiveTrue(pageable);
        return toPage(result, community -> new CommunityResponse(community.getName(), community.getMemberCount()));
    }

    public CommunityDetailResponse getCommunity(String name) {
        Community community = communities.findByNameIgnoreCaseAndActiveTrue(name)
                .orElseThrow(() -> new CommunityNotFoundException(name));
        List<PostResponse> posts = postService.findPostsByCommunity(community.getId());
        return new CommunityDetailResponse(
                community.getId(),
                community.getName(),
                community.getDescription(),
                community.getCreatorId(),
                community.getMemberCount(),
                community.getCreatedAt(),
                posts);
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

package com.levi9.reddit.community.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.levi9.reddit.community.contracts.CommunityDetailResponse;
import com.levi9.reddit.community.contracts.CommunityResponse;
import com.levi9.reddit.community.contracts.PageResponse;
import com.levi9.reddit.community.contracts.PostResponse;
import com.levi9.reddit.community.core.exception.CommunityNotFoundException;
import com.levi9.reddit.community.core.model.Community;
import com.levi9.reddit.community.infrastructure.repository.CommunityRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@ExtendWith(MockitoExtension.class)
class CommunityServiceTest {

    @Mock
    private CommunityRepository communities;

    @Mock
    private PostServiceClient postService;

    @InjectMocks
    private CommunityService service;

    @Test
    void findCommunities_mapsOnlyNameAndMemberCountAndSortsByName() {
        Community community = new Community("backend", 42L);
        community.updateMemberCount(7);
        when(communities.findByActiveTrue(any())).thenReturn(page(community));

        PageResponse<CommunityResponse> result = service.findCommunities(0, 20);

        assertThat(result.content()).containsExactly(new CommunityResponse("backend", 7));
        assertThat(result.totalElements()).isEqualTo(1);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(communities).findByActiveTrue(pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isZero();
        assertThat(pageable.getValue().getPageSize()).isEqualTo(20);
        assertThat(pageable.getValue().getSort())
                .isEqualTo(Sort.by(Sort.Order.asc("name"), Sort.Order.asc("id")));
    }

    @Test
    void getCommunity_returnsAllDetailsAndPosts() {
        Community community = new Community("backend", 42L);
        community.updateDescription("Backend discussion");
        community.updateMemberCount(7);
        when(communities.findByNameIgnoreCaseAndActiveTrue("backend")).thenReturn(Optional.of(community));
        PostResponse post = new PostResponse(
                11L, "Hello", "Body", 2L, "luka", 1L, 3, 0, Instant.parse("2026-11-01T10:00:00Z"), null);
        when(postService.findPostsByCommunity(community.getId())).thenReturn(List.of(post));

        CommunityDetailResponse result = service.getCommunity("backend");

        assertThat(result.id()).isEqualTo(community.getId());
        assertThat(result.name()).isEqualTo("backend");
        assertThat(result.description()).isEqualTo("Backend discussion");
        assertThat(result.creatorId()).isEqualTo(42L);
        assertThat(result.memberCount()).isEqualTo(7);
        assertThat(result.createdAt()).isEqualTo(community.getCreatedAt());
        assertThat(result.posts()).containsExactly(post);
    }

    @Test
    void getCommunity_missingOrInactive_throwsNotFound() {
        when(communities.findByNameIgnoreCaseAndActiveTrue("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getCommunity("missing"))
                .isInstanceOf(CommunityNotFoundException.class)
                .hasMessage("Community not found: missing");
    }

    private static <T> Page<T> page(T item) {
        return new PageImpl<>(List.of(item), PageRequest.of(0, 20), 1);
    }
}

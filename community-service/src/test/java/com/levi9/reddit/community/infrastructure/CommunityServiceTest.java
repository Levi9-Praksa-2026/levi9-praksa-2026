package com.levi9.reddit.community.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.levi9.reddit.community.contracts.CommunityDetailResponse;
import com.levi9.reddit.community.contracts.CommunityResponse;
import com.levi9.reddit.community.contracts.CommunitySort;
import com.levi9.reddit.community.contracts.PageResponse;
import com.levi9.reddit.community.core.exception.CommunityNotFoundException;
import com.levi9.reddit.community.core.model.Community;
import com.levi9.reddit.community.infrastructure.repository.CommunityRepository;
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

    @InjectMocks
    private CommunityService service;

    @Test
    void findCommunities_mapsOnlyNameAndMemberCountAndSortsByNewest() {
        Community community = new Community("backend", 42L);
        community.updateMemberCount(7);
        when(communities.findByActiveTrue(any())).thenReturn(page(community));

        PageResponse<CommunityResponse> result = service.findCommunities(CommunitySort.NEW, null, 0, 20);

        assertThat(result.content()).containsExactly(new CommunityResponse("backend", 7));
        assertThat(result.totalElements()).isEqualTo(1);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(communities).findByActiveTrue(pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isZero();
        assertThat(pageable.getValue().getPageSize()).isEqualTo(20);
        assertThat(pageable.getValue().getSort())
                .isEqualTo(Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
    }

    @Test
    void findCommunities_withTopSortsByMemberCount() {
        when(communities.findByActiveTrue(any())).thenReturn(page(new Community("backend", 42L)));

        service.findCommunities(CommunitySort.TOP, null, 0, 20);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(communities).findByActiveTrue(pageable.capture());
        assertThat(pageable.getValue().getSort())
                .isEqualTo(Sort.by(Sort.Order.desc("memberCount"), Sort.Order.desc("id")));
    }

    @Test
    void findCommunities_withNameUsesTheFilteredQuery() {
        Community community = new Community("backend", 42L);
        community.updateMemberCount(7);
        when(communities.findByActiveTrueAndNameContainingIgnoreCase(eq("back"), any()))
                .thenReturn(page(community));

        PageResponse<CommunityResponse> result =
                service.findCommunities(CommunitySort.NEW, "  back  ", 0, 20);

        assertThat(result.content()).containsExactly(new CommunityResponse("backend", 7));
        verify(communities).findByActiveTrueAndNameContainingIgnoreCase(eq("back"), any());
        verify(communities, never()).findByActiveTrue(any());
    }

    @Test
    void findCommunities_withBlankNameUsesTheUnfilteredQuery() {
        when(communities.findByActiveTrue(any())).thenReturn(page(new Community("backend", 42L)));

        service.findCommunities(CommunitySort.NEW, "   ", 0, 20);

        verify(communities).findByActiveTrue(any());
        verify(communities, never()).findByActiveTrueAndNameContainingIgnoreCase(any(), any());
    }

    @Test
    void getCommunity_returnsAllDetails() {
        Community community = new Community("backend", 42L);
        community.updateDescription("Backend discussion");
        community.updateMemberCount(7);
        when(communities.findActiveByName("backend")).thenReturn(Optional.of(community));

        CommunityDetailResponse result = service.getCommunity("backend");

        assertThat(result.id()).isEqualTo(community.getId());
        assertThat(result.name()).isEqualTo("backend");
        assertThat(result.description()).isEqualTo("Backend discussion");
        assertThat(result.memberCount()).isEqualTo(7);
        assertThat(result.createdAt()).isEqualTo(community.getCreatedAt());
    }

    @Test
    void getCommunity_missingOrInactive_throwsNotFound() {
        when(communities.findActiveByName("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getCommunity("missing"))
                .isInstanceOf(CommunityNotFoundException.class)
                .hasMessage("Community not found: missing");
    }

    private static <T> Page<T> page(T item) {
        return new PageImpl<>(List.of(item), PageRequest.of(0, 20), 1);
    }
}

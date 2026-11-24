package com.levi9.reddit.community.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.levi9.reddit.community.entity.Community;
import com.levi9.reddit.community.entity.CommunityMember;
import com.levi9.reddit.community.entity.CommunityMemberId;
import com.levi9.reddit.community.exception.CommunityNotFoundException;
import com.levi9.reddit.community.repository.CommunityMemberRepository;
import com.levi9.reddit.community.repository.CommunityRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class CommunityMembershipServiceTest {

    private static final long USER_ID = 42L;

    @Mock
    private CommunityRepository communities;

    @Mock
    private CommunityMemberRepository members;

    @InjectMocks
    private CommunityMembershipService service;

    @Test
    void joinAddsMembershipAndIncrementsCount() {
        Community community = community("backend", 3);
        given(communities.findActiveByNameForUpdate("backend")).willReturn(Optional.of(community));
        given(members.existsById(memberId())).willReturn(false);

        service.join("backend", USER_ID);

        verify(members).save(any(CommunityMember.class));
        assertThat(community.getMemberCount()).isEqualTo(4);
    }

    @Test
    void joinTwiceChangesNothing() {
        Community community = community("backend", 3);
        given(communities.findActiveByNameForUpdate("backend")).willReturn(Optional.of(community));
        given(members.existsById(memberId())).willReturn(true);

        service.join("backend", USER_ID);

        verify(members, never()).save(any());
        assertThat(community.getMemberCount()).isEqualTo(3);
    }

    @Test
    void leaveRemovesMembershipAndDecrementsCount() {
        Community community = community("backend", 3);
        given(communities.findByNameForUpdate("backend")).willReturn(Optional.of(community));
        given(members.existsById(memberId())).willReturn(true);

        service.leave("backend", USER_ID);

        verify(members).deleteById(memberId());
        assertThat(community.getMemberCount()).isEqualTo(2);
    }

    @Test
    void leaveWhenNotAMemberChangesNothing() {
        Community community = community("backend", 3);
        given(communities.findByNameForUpdate("backend")).willReturn(Optional.of(community));
        given(members.existsById(memberId())).willReturn(false);

        service.leave("backend", USER_ID);

        verify(members, never()).deleteById(any());
        assertThat(community.getMemberCount()).isEqualTo(3);
    }

    @Test
    void leaveFindsInactiveCommunities() {
        Community community = community("backend", 1);
        community.deactivate();
        given(communities.findByNameForUpdate("backend")).willReturn(Optional.of(community));
        given(members.existsById(memberId())).willReturn(true);

        service.leave("backend", USER_ID);

        verify(members).deleteById(memberId());
        assertThat(community.getMemberCount()).isZero();
    }

    @Test
    void isMember_returnsTrueForMember() {
        given(communities.findById(7L)).willReturn(Optional.of(community("backend", 3)));
        given(members.existsById(memberId())).willReturn(true);

        assertThat(service.isMember(7L, USER_ID)).isTrue();
    }

    @Test
    void isMember_returnsFalseForNonMember() {
        given(communities.findById(7L)).willReturn(Optional.of(community("backend", 3)));
        given(members.existsById(memberId())).willReturn(false);

        assertThat(service.isMember(7L, USER_ID)).isFalse();
    }

    @Test
    void isMember_missingOrInactiveCommunity_throwsNotFound() {
        given(communities.findById(7L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.isMember(7L, USER_ID))
                .isInstanceOf(CommunityNotFoundException.class);

        Community inactive = community("backend", 3);
        inactive.deactivate();
        given(communities.findById(8L)).willReturn(Optional.of(inactive));

        assertThatThrownBy(() -> service.isMember(8L, USER_ID))
                .isInstanceOf(CommunityNotFoundException.class);
        verify(members, never()).existsById(any());
    }

    @Test
    void missingCommunityThrowsNotFound() {
        given(communities.findActiveByNameForUpdate("missing")).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.join("missing", USER_ID))
                .isInstanceOf(CommunityNotFoundException.class);
        verify(members, never()).save(any());
    }

    private static CommunityMemberId memberId() {
        return new CommunityMemberId(7L, USER_ID);
    }

    private static Community community(String name, int memberCount) {
        Community community = new Community(name, 42L);
        community.updateMemberCount(memberCount);
        ReflectionTestUtils.setField(community, "id", 7L);
        return community;
    }
}

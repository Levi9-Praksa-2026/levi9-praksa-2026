package com.levi9.reddit.community.infrastructure;

import com.levi9.reddit.community.core.exception.CommunityNotFoundException;
import com.levi9.reddit.community.core.model.Community;
import com.levi9.reddit.community.core.model.CommunityMember;
import com.levi9.reddit.community.core.model.CommunityMemberId;
import com.levi9.reddit.community.infrastructure.repository.CommunityMemberRepository;
import com.levi9.reddit.community.infrastructure.repository.CommunityRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Membership changes and the stored member count are always written in the same transaction. */
@Service
public class CommunityMembershipService {
    private final CommunityRepository communities;
    private final CommunityMemberRepository members;

    public CommunityMembershipService(CommunityRepository communities, CommunityMemberRepository members) {
        this.communities = communities;
        this.members = members;
    }

    /** Joining twice is harmless: the second call changes nothing. */
    @Transactional
    public void join(String name, long userId) {
        Community community = communities.findActiveByNameForUpdate(name)
                .orElseThrow(() -> new CommunityNotFoundException(name));
        CommunityMemberId memberId = new CommunityMemberId(community.getId(), userId);
        if (members.existsById(memberId)) {
            return;
        }
        members.save(new CommunityMember(memberId));
        community.updateMemberCount(community.getMemberCount() + 1);
    }

    /**
     * Leaving when not a member is harmless: the call changes nothing. Inactive communities are included,
     * otherwise a member of a shut-down community could never remove the membership.
     */
    @Transactional
    public void leave(String name, long userId) {
        Community community = communities.findByNameForUpdate(name)
                .orElseThrow(() -> new CommunityNotFoundException(name));
        CommunityMemberId memberId = new CommunityMemberId(community.getId(), userId);
        if (!members.existsById(memberId)) {
            return;
        }
        members.deleteById(memberId);
        community.updateMemberCount(community.getMemberCount() - 1);
    }
}

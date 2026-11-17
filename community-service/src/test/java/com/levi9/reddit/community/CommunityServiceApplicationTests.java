package com.levi9.reddit.community;

import com.levi9.reddit.community.core.model.Community;
import com.levi9.reddit.community.core.model.CommunityMember;
import com.levi9.reddit.community.core.model.CommunityMemberId;
import com.levi9.reddit.community.infrastructure.repository.CommunityMemberRepository;
import com.levi9.reddit.community.infrastructure.repository.CommunityRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class CommunityServiceApplicationTests {

    @Autowired
    private CommunityRepository communityRepository;

    @Autowired
    private CommunityMemberRepository communityMemberRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    void persistsAndReloadsServiceModels() {
        Community community = communityRepository.save(new Community("backend", 42L));
        CommunityMemberId memberId = new CommunityMemberId(community.getId(), 42L);
        communityMemberRepository.save(new CommunityMember(memberId));
        community.updateDescription("Backend discussion");
        community.updateMemberCount(1);
        community.deactivate();

        entityManager.flush();
        entityManager.clear();

        Community stored = communityRepository.findById(community.getId()).orElseThrow();
        assertThat(stored.getName()).isEqualTo("backend");
        assertThat(stored.getDescription()).isEqualTo("Backend discussion");
        assertThat(stored.getCreatorId()).isEqualTo(42L);
        assertThat(stored.getMemberCount()).isEqualTo(1);
        assertThat(stored.isActive()).isFalse();
        assertThat(stored.getVersion()).isEqualTo(1);
        assertThat(stored.getCreatedAt()).isNotNull();
        CommunityMember member = communityMemberRepository.findById(memberId).orElseThrow();
        assertThat(member.getId()).isEqualTo(memberId);
        assertThat(member.getId().getCommunityId()).isEqualTo(community.getId());
        assertThat(member.getId().getUserId()).isEqualTo(42L);
        assertThat(member.getJoinedAt()).isNotNull();
    }
}

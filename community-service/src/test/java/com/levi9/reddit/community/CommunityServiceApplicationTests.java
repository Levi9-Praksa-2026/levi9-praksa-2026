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
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class CommunityServiceApplicationTests {

    @Autowired
    private CommunityRepository communityRepository;

    @Autowired
    private CommunityMemberRepository communityMemberRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private MockMvc mockMvc;

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
        assertThat(stored.getCreatedAt()).isNotNull();
        CommunityMember member = communityMemberRepository.findById(memberId).orElseThrow();
        assertThat(member.getId()).isEqualTo(memberId);
        assertThat(member.getId().getCommunityId()).isEqualTo(community.getId());
        assertThat(member.getId().getUserId()).isEqualTo(42L);
        assertThat(member.getJoinedAt()).isNotNull();
    }

    @Test
    @Transactional
    void listsActiveCommunitiesByNameWithTheirMemberCounts() throws Exception {
        Community zeta = communityRepository.save(new Community("zeta", 1L));
        zeta.updateMemberCount(5);
        Community alpha = communityRepository.save(new Community("alpha", 2L));
        alpha.updateMemberCount(2);
        Community inactive = new Community("archived", 3L);
        inactive.deactivate();
        communityRepository.save(inactive);
        entityManager.flush();

        mockMvc.perform(get("/api/communities"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(alpha.getId().intValue()))
                .andExpect(jsonPath("$[0].name").value("alpha"))
                .andExpect(jsonPath("$[0].memberCount").value(2))
                .andExpect(jsonPath("$[1].id").value(zeta.getId().intValue()))
                .andExpect(jsonPath("$[1].name").value("zeta"))
                .andExpect(jsonPath("$[1].memberCount").value(5));
    }
}

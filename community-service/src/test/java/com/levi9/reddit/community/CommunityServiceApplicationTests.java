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
import static org.hamcrest.Matchers.contains;
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
    void listsActiveCommunitiesNewestFirstWithOnlyTheirNameAndMemberCount() throws Exception {
        // "alpha" is saved first, "zulu" second: newest-first must put zulu before alpha,
        // which is the opposite of the old alphabetical order.
        Community alpha = communityRepository.save(new Community("alpha", 1L));
        alpha.updateMemberCount(2);
        Community zulu = communityRepository.save(new Community("zulu", 2L));
        zulu.updateMemberCount(5);
        Community inactive = new Community("archived", 3L);
        inactive.deactivate();
        communityRepository.save(inactive);
        entityManager.flush();

        mockMvc.perform(get("/api/communities"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].name").value("zulu"))
                .andExpect(jsonPath("$.content[0].memberCount").value(5))
                .andExpect(jsonPath("$.content[0].id").doesNotExist())
                .andExpect(jsonPath("$.content[1].name").value("alpha"))
                .andExpect(jsonPath("$.content[1].memberCount").value(2))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    @Transactional
    void sortsByMostMembersWhenSortIsTop() throws Exception {
        Community big = communityRepository.save(new Community("big", 1L));
        big.updateMemberCount(9);
        Community small = communityRepository.save(new Community("small", 2L));
        small.updateMemberCount(1);
        entityManager.flush();

        mockMvc.perform(get("/api/communities").param("sort", "top"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("big"))
                .andExpect(jsonPath("$.content[1].name").value("small"));
    }

    @Test
    @Transactional
    void filtersByNameIgnoringCase() throws Exception {
        communityRepository.save(new Community("backend", 1L));
        communityRepository.save(new Community("frontend", 2L));
        communityRepository.save(new Community("backendops", 3L));
        entityManager.flush();

        mockMvc.perform(get("/api/communities").param("name", "BACK"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    @Transactional
    void sortHotIsNotAvailableYet() throws Exception {
        mockMvc.perform(get("/api/communities").param("sort", "hot"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errors[0].field").value("sort"));
    }

    @Test
    @Transactional
    void paginatesCommunities() throws Exception {
        communityRepository.save(new Community("alpha", 1L));
        communityRepository.save(new Community("beta", 2L));
        communityRepository.save(new Community("gamma", 3L));
        entityManager.flush();

        mockMvc.perform(get("/api/communities").param("page", "1").param("size", "2"))
                .andExpect(status().isOk())
                // newest-first: gamma, beta, alpha -> page 1 holds alpha
                .andExpect(jsonPath("$.content[*].name").value(contains("alpha")))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    @Test
    @Transactional
    void getsCommunityWithAllItsDetails() throws Exception {
        Community community = communityRepository.save(new Community("backend", 42L));
        community.updateDescription("Backend discussion");
        community.updateMemberCount(7);
        entityManager.flush();

        mockMvc.perform(get("/api/communities/{name}", "backend"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(community.getId().intValue()))
                .andExpect(jsonPath("$.description").value("Backend discussion"))
                .andExpect(jsonPath("$.creatorId").doesNotExist())
                .andExpect(jsonPath("$.memberCount").value(7))
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.posts").doesNotExist());
    }

    @Test
    @Transactional
    void missingOrInactiveCommunityIsNotFound() throws Exception {
        Community inactive = new Community("archived", 3L);
        inactive.deactivate();
        communityRepository.save(inactive);
        entityManager.flush();

        mockMvc.perform(get("/api/communities/{name}", "archived"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorType").value("COMMUNITY_NOT_FOUND"));
    }
}

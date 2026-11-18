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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
    void listsActiveCommunitiesByNameWithOnlyTheirNameAndMemberCount() throws Exception {
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
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].name").value("alpha"))
                .andExpect(jsonPath("$.content[0].memberCount").value(2))
                .andExpect(jsonPath("$.content[0].id").doesNotExist())
                .andExpect(jsonPath("$.content[1].name").value("zeta"))
                .andExpect(jsonPath("$.content[1].memberCount").value(5))
                .andExpect(jsonPath("$.totalElements").value(2));
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
                .andExpect(jsonPath("$.content[*].name").value(contains("gamma")))
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
    void createsCommunityWithMockCreator() throws Exception {
        mockMvc.perform(post("/api/communities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"backend","description":"Backend discussion"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.name").value("backend"))
                .andExpect(jsonPath("$.description").value("Backend discussion"));

        entityManager.flush();
        Community stored = communityRepository.findByName("backend").orElseThrow();
        assertThat(stored.getCreatorId()).isEqualTo(1L);
        assertThat(stored.isActive()).isTrue();
    }

    @Test
    @Transactional
    void creatingSameNameAgainReturnsConflict() throws Exception {
        communityRepository.save(new Community("backend", 1L));
        entityManager.flush();

        mockMvc.perform(post("/api/communities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"BACKEND","description":null}
                                """))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errorType").value("COMMUNITY_NAME_TAKEN"));
    }

    @Test
    @Transactional
    void patchesDescriptionAndKeepsTheName() throws Exception {
        communityRepository.save(new Community("backend", 1L));
        entityManager.flush();

        mockMvc.perform(patch("/api/communities/backend")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"description":"New description"}
                                """))
                .andExpect(status().isOk());

        entityManager.flush();
        assertThat(communityRepository.findByName("backend").orElseThrow().getDescription())
                .isEqualTo("New description");
    }

    @Test
    @Transactional
    void deactivateHidesTheCommunityAndReactivateBringsItBack() throws Exception {
        communityRepository.save(new Community("backend", 1L));
        entityManager.flush();

        mockMvc.perform(delete("/api/communities/backend"))
                .andExpect(status().isNoContent());
        entityManager.flush();

        assertThat(communityRepository.findByName("backend").orElseThrow().isActive()).isFalse();
        mockMvc.perform(get("/api/communities/backend"))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/communities/backend/reactivate"))
                .andExpect(status().isNoContent());
        entityManager.flush();

        assertThat(communityRepository.findByName("backend").orElseThrow().isActive()).isTrue();
        mockMvc.perform(get("/api/communities/backend"))
                .andExpect(status().isOk());
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

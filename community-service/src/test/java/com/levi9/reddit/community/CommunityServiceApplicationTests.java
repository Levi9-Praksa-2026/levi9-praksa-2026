package com.levi9.reddit.community;

import com.levi9.reddit.community.contracts.PostResponse;
import com.levi9.reddit.community.core.model.Community;
import com.levi9.reddit.community.core.model.CommunityMember;
import com.levi9.reddit.community.core.model.CommunityMemberId;
import com.levi9.reddit.community.infrastructure.PostServiceClient;
import com.levi9.reddit.community.infrastructure.repository.CommunityMemberRepository;
import com.levi9.reddit.community.infrastructure.repository.CommunityRepository;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.mockito.BDDMockito.given;
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

    @MockitoBean
    private PostServiceClient postService;

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
    void getsCommunityWithAllItsDetailsAndPosts() throws Exception {
        Community community = communityRepository.save(new Community("backend", 42L));
        community.updateDescription("Backend discussion");
        community.updateMemberCount(7);
        entityManager.flush();

        PostResponse post = new PostResponse(
                11L, "Hello", "Body", 2L, "luka", community.getId(), 3, 0,
                Instant.parse("2026-11-01T10:00:00Z"), null);
        given(postService.findPostsByCommunity(community.getId())).willReturn(List.of(post));

        mockMvc.perform(get("/api/communities/{name}", "backend"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(community.getId().intValue()))
                .andExpect(jsonPath("$.description").value("Backend discussion"))
                .andExpect(jsonPath("$.creatorId").doesNotExist())
                .andExpect(jsonPath("$.memberCount").value(7))
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.posts[0].title").value("Hello"));
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

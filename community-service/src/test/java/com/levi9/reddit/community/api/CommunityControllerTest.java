package com.levi9.reddit.community.api;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.levi9.reddit.community.contracts.CommunityDetailResponse;
import com.levi9.reddit.community.contracts.CommunityResponse;
import com.levi9.reddit.community.contracts.PageResponse;
import com.levi9.reddit.community.contracts.PostResponse;
import com.levi9.reddit.community.core.exception.CommunityNotFoundException;
import com.levi9.reddit.community.infrastructure.CommunityService;
import com.levi9.reddit.community.infrastructure.PostServiceUnavailableException;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(CommunityController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class CommunityControllerTest {

    private static final Instant CREATED = Instant.parse("2026-11-01T10:00:00Z");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CommunityService communityService;

    @Test
    void findCommunities_returnsOnlyNameAndMemberCountPerItem() throws Exception {
        given(communityService.findCommunities(0, 20)).willReturn(
                new PageResponse<>(List.of(new CommunityResponse("backend", 7)), 0, 20, 1, 1));

        mockMvc.perform(get("/api/communities"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.content[0].name").value("backend"))
                .andExpect(jsonPath("$.content[0].memberCount").value(7))
                .andExpect(jsonPath("$.content[0].id").doesNotExist())
                .andExpect(jsonPath("$.content[0].description").doesNotExist())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1));
    }

    @Test
    void findCommunities_passesPaging() throws Exception {
        given(communityService.findCommunities(2, 10)).willReturn(
                new PageResponse<>(List.of(), 2, 10, 0, 0));

        mockMvc.perform(get("/api/communities").param("page", "2").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(2))
                .andExpect(jsonPath("$.size").value(10));
    }

    @Test
    void findCommunities_withTooLargePageSize_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/communities").param("size", "1000"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(communityService);
    }

    @Test
    void findCommunities_withNonNumericPage_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/communities").param("page", "abc"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getCommunity_returnsEveryDetailAndItsPosts() throws Exception {
        PostResponse post = new PostResponse(11L, "Hello", "Body", 2L, "luka", 1L, 3, 0, CREATED, null);
        given(communityService.getCommunity("backend")).willReturn(new CommunityDetailResponse(
                1L, "backend", "Backend discussion", 7, CREATED, List.of(post)));

        mockMvc.perform(get("/api/communities/{name}", "backend"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("backend"))
                .andExpect(jsonPath("$.description").value("Backend discussion"))
                .andExpect(jsonPath("$.creatorId").doesNotExist())
                .andExpect(jsonPath("$.memberCount").value(7))
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.posts[0].id").value(11))
                .andExpect(jsonPath("$.posts[0].title").value("Hello"))
                .andExpect(jsonPath("$.posts[0].authorUsername").value("luka"));
    }

    @Test
    void getCommunity_missing_returnsProblemDetail() throws Exception {
        given(communityService.getCommunity("missing")).willThrow(new CommunityNotFoundException("missing"));

        mockMvc.perform(get("/api/communities/{name}", "missing"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.errorType").value("COMMUNITY_NOT_FOUND"));
    }

    @Test
    void getCommunity_whenPostServiceIsDown_returnsBadGateway() throws Exception {
        given(communityService.getCommunity("backend"))
                .willThrow(new PostServiceUnavailableException("post-service down", null));

        mockMvc.perform(get("/api/communities/{name}", "backend"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.title").value("Post service unavailable"))
                .andExpect(jsonPath("$.errorType").value("POST_SERVICE_UNAVAILABLE"));
    }
}

package com.levi9.reddit.community.api;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.levi9.reddit.community.contracts.CommunityDetailResponse;
import com.levi9.reddit.community.contracts.CommunityResponse;
import com.levi9.reddit.community.contracts.CommunitySort;
import com.levi9.reddit.community.contracts.PageResponse;
import com.levi9.reddit.community.core.exception.CommunityNotFoundException;
import com.levi9.reddit.community.infrastructure.CommunityService;
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
        given(communityService.findCommunities(CommunitySort.NEW, null, 0, 20)).willReturn(
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
        given(communityService.findCommunities(CommunitySort.NEW, null, 2, 10)).willReturn(
                new PageResponse<>(List.of(), 2, 10, 0, 0));

        mockMvc.perform(get("/api/communities").param("page", "2").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(2))
                .andExpect(jsonPath("$.size").value(10));
    }

    @Test
    void findCommunities_passesNameAndSort() throws Exception {
        given(communityService.findCommunities(CommunitySort.TOP, "back", 0, 20))
                .willReturn(new PageResponse<>(List.of(), 0, 20, 0, 0));

        mockMvc.perform(get("/api/communities").param("sort", "top").param("name", "back"))
                .andExpect(status().isOk());

        verify(communityService).findCommunities(CommunitySort.TOP, "back", 0, 20);
    }

    @Test
    void findCommunities_sortIsCaseInsensitive() throws Exception {
        given(communityService.findCommunities(CommunitySort.NEW, null, 0, 20))
                .willReturn(new PageResponse<>(List.of(), 0, 20, 0, 0));

        mockMvc.perform(get("/api/communities").param("sort", "NEW"))
                .andExpect(status().isOk());
    }

    @Test
    void findCommunities_withSortHot_returnsBadRequestWithFieldError() throws Exception {
        mockMvc.perform(get("/api/communities").param("sort", "hot"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errors[0].field").value("sort"))
                .andExpect(jsonPath("$.errors[0].message").value(
                        org.hamcrest.Matchers.containsString("not available yet")));

        verifyNoInteractions(communityService);
    }

    @Test
    void findCommunities_withUnknownSort_returnsBadRequestWithFieldError() throws Exception {
        mockMvc.perform(get("/api/communities").param("sort", "cheapest"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errors[0].field").value("sort"));

        verifyNoInteractions(communityService);
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
    void getCommunity_returnsEveryDetail() throws Exception {
        given(communityService.getCommunity("backend")).willReturn(new CommunityDetailResponse(
                1L, "backend", "Backend discussion", 7, CREATED));

        mockMvc.perform(get("/api/communities/{name}", "backend"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("backend"))
                .andExpect(jsonPath("$.description").value("Backend discussion"))
                .andExpect(jsonPath("$.creatorId").doesNotExist())
                .andExpect(jsonPath("$.memberCount").value(7))
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.posts").doesNotExist());
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
}

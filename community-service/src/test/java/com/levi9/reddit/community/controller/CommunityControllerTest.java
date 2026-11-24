package com.levi9.reddit.community.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.levi9.reddit.community.dto.CommunityDTO;
import com.levi9.reddit.community.dto.CommunityDetailDTO;
import com.levi9.reddit.community.dto.CommunitySort;
import com.levi9.reddit.community.dto.PageDTO;
import com.levi9.reddit.community.exception.CommunityNotFoundException;
import com.levi9.reddit.community.exception.ConflictException;
import com.levi9.reddit.community.exception.ErrorType;
import com.levi9.reddit.community.exception.GlobalExceptionHandler;
import com.levi9.reddit.community.config.SecurityConfig;
import com.levi9.reddit.community.service.CommunityMembershipService;
import com.levi9.reddit.community.service.CommunityService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@WebMvcTest(CommunityController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class CommunityControllerTest {

    private static final Instant CREATED = Instant.parse("2026-11-01T10:00:00Z");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CommunityService communityService;

    @MockitoBean
    private CommunityMembershipService membershipService;

    private static RequestPostProcessor admin() {
        return jwt().jwt(j -> j.subject("1").claim("roles", List.of("ADMIN")))
                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    @Test
    void findCommunities_returnsOnlyNameAndMemberCountPerItem() throws Exception {
        given(communityService.findCommunities(CommunitySort.NEW, null, 0, 20)).willReturn(
                new PageDTO<>(List.of(new CommunityDTO("backend", 7)), 0, 20, 1, 1));

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
                new PageDTO<>(List.of(), 2, 10, 0, 0));

        mockMvc.perform(get("/api/communities").param("page", "2").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(2))
                .andExpect(jsonPath("$.size").value(10));
    }

    @Test
    void findCommunities_passesNameAndSort() throws Exception {
        given(communityService.findCommunities(CommunitySort.TOP, "back", 0, 20))
                .willReturn(new PageDTO<>(List.of(), 0, 20, 0, 0));

        mockMvc.perform(get("/api/communities").param("sort", "top").param("name", "back"))
                .andExpect(status().isOk());

        verify(communityService).findCommunities(CommunitySort.TOP, "back", 0, 20);
    }

    @Test
    void findCommunities_sortIsCaseInsensitive() throws Exception {
        // TOP is not the default, so this proves the value was actually parsed.
        given(communityService.findCommunities(CommunitySort.TOP, null, 0, 20))
                .willReturn(new PageDTO<>(List.of(), 0, 20, 0, 0));

        mockMvc.perform(get("/api/communities").param("sort", "TOP"))
                .andExpect(status().isOk());

        verify(communityService).findCommunities(CommunitySort.TOP, null, 0, 20);
    }

    @Test
    void findCommunities_withSortHot_returnsBadRequestWithFieldError() throws Exception {
        mockMvc.perform(get("/api/communities").param("sort", "hot"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errors[0].field").value("sort"))
                .andExpect(jsonPath("$.errors[0].message").value("sort must be new or top"));

        verifyNoInteractions(communityService);
    }

    @Test
    void findCommunities_withUnknownSort_returnsBadRequestWithFieldError() throws Exception {
        mockMvc.perform(get("/api/communities").param("sort", "cheapest"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errors[0].field").value("sort"))
                .andExpect(jsonPath("$.errors[0].message").value("sort must be new or top"));

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
    void inactiveList_asAdmin_returnsTheInactiveCommunities() throws Exception {
        given(communityService.findInactiveCommunities(CommunitySort.NEW, "back", 1, 10)).willReturn(
                new PageDTO<>(List.of(new CommunityDTO("archived", 3)), 1, 10, 1, 1));

        mockMvc.perform(get("/api/communities")
                        .param("inactive", "true")
                        .param("name", "back")
                        .param("page", "1")
                        .param("size", "10")
                        .with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("archived"))
                .andExpect(jsonPath("$.content[0].memberCount").value(3));

        verify(communityService).findInactiveCommunities(CommunitySort.NEW, "back", 1, 10);
        verifyNoInteractions(membershipService);
    }

    @Test
    void inactiveList_passesTheSortThrough() throws Exception {
        given(communityService.findInactiveCommunities(CommunitySort.TOP, null, 0, 20)).willReturn(
                new PageDTO<>(List.of(), 0, 20, 0, 0));

        mockMvc.perform(get("/api/communities")
                        .param("inactive", "true")
                        .param("sort", "top")
                        .with(admin()))
                .andExpect(status().isOk());

        verify(communityService).findInactiveCommunities(CommunitySort.TOP, null, 0, 20);
    }

    @Test
    void inactiveFalse_asAdmin_returnsTheActiveList() throws Exception {
        given(communityService.findCommunities(CommunitySort.TOP, null, 0, 20)).willReturn(
                new PageDTO<>(List.of(), 0, 20, 0, 0));

        mockMvc.perform(get("/api/communities")
                        .param("inactive", "false")
                        .param("sort", "top")
                        .with(admin()))
                .andExpect(status().isOk());

        verify(communityService).findCommunities(CommunitySort.TOP, null, 0, 20);
        verify(communityService, never()).findInactiveCommunities(any(), anyString(), anyInt(), anyInt());
    }

    @Test
    void getCommunity_returnsEveryDetail() throws Exception {
        given(communityService.getCommunity("backend")).willReturn(new CommunityDetailDTO(
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

    @Test
    void join_usesJwtSubjectAsUserIdAndReturnsNoContent() throws Exception {
        mockMvc.perform(put("/api/communities/{name}/members/me", "backend")
                        .with(jwt().jwt(j -> j.subject("42"))))
                .andExpect(status().isNoContent());

        verify(membershipService).join("backend", 42L);
    }

    @Test
    void leave_usesJwtSubjectAsUserIdAndReturnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/communities/{name}/members/me", "backend")
                        .with(jwt().jwt(j -> j.subject("42"))))
                .andExpect(status().isNoContent());

        verify(membershipService).leave("backend", 42L);
    }

    @Test
    void join_unknownCommunityReturnsProblemDetail() throws Exception {
        willThrow(new CommunityNotFoundException("missing"))
                .given(membershipService).join("missing", 42L);

        mockMvc.perform(put("/api/communities/{name}/members/me", "missing")
                        .with(jwt().jwt(j -> j.subject("42"))))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errorType").value("COMMUNITY_NOT_FOUND"));
    }

    @Test
    void create_returnsCreatedCommunity() throws Exception {
        given(communityService.create("backend", "Backend discussion", 1L))
                .willReturn(new CommunityDetailDTO(1L, "backend", "Backend discussion", 0, CREATED));

        mockMvc.perform(post("/api/communities")
                        .with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"backend","description":"Backend discussion"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("backend"))
                .andExpect(jsonPath("$.description").value("Backend discussion"));

        verify(communityService).create("backend", "Backend discussion", 1L);
    }

    @Test
    void create_withInvalidName_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/communities")
                        .with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"bad name!","description":null}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("name"))
                .andExpect(jsonPath("$.errorType").doesNotExist());

        verifyNoInteractions(communityService);
    }

    @Test
    void create_withRedditPrefix_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/communities")
                        .with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"r/backend","description":null}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("name"));

        verifyNoInteractions(communityService);
    }

    @Test
    void create_withTakenName_returnsConflictProblemDetail() throws Exception {
        given(communityService.create(anyString(), nullable(String.class), anyLong()))
                .willThrow(new ConflictException(ErrorType.COMMUNITY_NAME_TAKEN, "Community name is already taken: backend"));

        mockMvc.perform(post("/api/communities")
                        .with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"backend","description":null}
                                """))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.errorType").value("COMMUNITY_NAME_TAKEN"));
    }

    @Test
    void updateDescription_changesOnlyTheDescription() throws Exception {
        mockMvc.perform(patch("/api/communities/{name}", "backend")
                        .with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"description":"New description"}
                                """))
                .andExpect(status().isOk());

        verify(communityService).updateDescription("backend", "New description");
    }

    @Test
    void updateDescription_withInvalidName_returnsBadRequest() throws Exception {
        mockMvc.perform(patch("/api/communities/{name}", "bad!name")
                        .with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"description":"New description"}
                                """))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(communityService);
    }

    @Test
    void updateDescription_withTooLongDescription_returnsBadRequest() throws Exception {
        String description = "x".repeat(2001);

        mockMvc.perform(patch("/api/communities/{name}", "backend")
                        .with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"" + description + "\"}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(communityService);
    }

    @Test
    void updateDescription_withEmptyBody_returnsBadRequest() throws Exception {
        mockMvc.perform(patch("/api/communities/{name}", "backend")
                        .with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("request"));

        verifyNoInteractions(communityService);
    }

    @Test
    void deactivate_shutsDownCommunity() throws Exception {
        mockMvc.perform(delete("/api/communities/{name}", "backend").with(admin()))
                .andExpect(status().isNoContent());

        verify(communityService).deactivate("backend");
    }

    @Test
    void deactivate_missingCommunity_returnsProblemDetail() throws Exception {
        willThrow(new CommunityNotFoundException("missing")).given(communityService).deactivate(eq("missing"));

        mockMvc.perform(delete("/api/communities/{name}", "missing").with(admin()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorType").value("COMMUNITY_NOT_FOUND"));
    }

    @Test
    void reactivate_undoesShutdown() throws Exception {
        mockMvc.perform(post("/api/communities/{name}/reactivate", "backend").with(admin()))
                .andExpect(status().isNoContent());

        verify(communityService).reactivate("backend");
    }
}

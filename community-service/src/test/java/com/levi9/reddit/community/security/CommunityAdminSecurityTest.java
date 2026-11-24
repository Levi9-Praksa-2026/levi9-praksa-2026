package com.levi9.reddit.community.security;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.BDDMockito.given;
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

import com.levi9.reddit.community.config.SecurityConfig;
import com.levi9.reddit.community.controller.CommunityController;
import com.levi9.reddit.community.dto.CommunityDetailDTO;
import com.levi9.reddit.community.dto.CommunitySort;
import com.levi9.reddit.community.dto.PageDTO;
import com.levi9.reddit.community.exception.GlobalExceptionHandler;
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

/** Role and authentication checks; callers are real JWT principals. */
@WebMvcTest(CommunityController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class CommunityAdminSecurityTest {

    private static final String BODY = """
            {"name":"backend","description":"Backend discussion"}
            """;

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

    private static RequestPostProcessor regularUser() {
        return jwt().jwt(j -> j.subject("6").claim("roles", List.of("USER")))
                .authorities(new SimpleGrantedAuthority("ROLE_USER"));
    }

    @Test
    void create_withoutCaller_returnsUnauthorizedProblemDetail() throws Exception {
        mockMvc.perform(post("/api/communities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Unauthorized"))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.detail").value("Authentication is required"))
                .andExpect(jsonPath("$.instance").value("/api/communities"))
                .andExpect(jsonPath("$.properties").doesNotExist())
                .andExpect(jsonPath("$.errorType").doesNotExist());
    }

    @Test
    void create_asUser_returnsForbiddenProblemDetail() throws Exception {
        mockMvc.perform(post("/api/communities")
                        .with(regularUser())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Forbidden"))
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.detail").value("Access is denied"))
                .andExpect(jsonPath("$.instance").value("/api/communities"))
                .andExpect(jsonPath("$.properties").doesNotExist())
                .andExpect(jsonPath("$.errorType").doesNotExist());
    }

    @Test
    void create_asUserWithInvalidBody_isForbiddenBeforeValidation() throws Exception {
        mockMvc.perform(post("/api/communities")
                        .with(regularUser())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"bad name!","description":null}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void create_asAdmin_isAllowed() throws Exception {
        given(communityService.create(anyString(), nullable(String.class), anyLong()))
                .willReturn(new CommunityDetailDTO(1L, "backend", "Backend discussion", 0, Instant.now()));

        mockMvc.perform(post("/api/communities")
                        .with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isCreated());
    }

    @Test
    void patchDeleteAndReactivate_asUser_areForbidden() throws Exception {
        mockMvc.perform(patch("/api/communities/backend")
                        .with(regularUser())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"description":"New description"}
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/communities/backend").with(regularUser()))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/communities/backend/reactivate").with(regularUser()))
                .andExpect(status().isForbidden());
    }

    @Test
    void joinAndLeave_withoutCaller_returnUnauthorizedProblemDetail() throws Exception {
        mockMvc.perform(put("/api/communities/backend/members/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Unauthorized"))
                .andExpect(jsonPath("$.status").value(401));

        mockMvc.perform(delete("/api/communities/backend/members/me"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(membershipService);
    }

    @Test
    void readsStayPublic() throws Exception {
        given(communityService.findCommunities(CommunitySort.NEW, null, 0, 20))
                .willReturn(new PageDTO<>(List.of(), 0, 20, 0, 0));

        mockMvc.perform(get("/api/communities"))
                .andExpect(status().isOk());
    }

    @Test
    void inactiveList_withoutCaller_returnsUnauthorizedProblemDetail() throws Exception {
        mockMvc.perform(get("/api/communities").param("inactive", "true"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Authentication is required"));
        verifyNoInteractions(communityService);
    }

    @Test
    void inactiveList_asUser_isForbidden() throws Exception {
        mockMvc.perform(get("/api/communities").param("inactive", "true").with(regularUser()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("Access is denied"));
        verifyNoInteractions(communityService);
    }

    @Test
    void inactiveList_asAdmin_isAllowed() throws Exception {
        given(communityService.findInactiveCommunities(null, 0, 20))
                .willReturn(new PageDTO<>(List.of(), 0, 20, 0, 0));

        mockMvc.perform(get("/api/communities").param("inactive", "true").with(admin()))
                .andExpect(status().isOk());

        verify(communityService).findInactiveCommunities(null, 0, 20);
    }
}

package com.levi9.reddit.community.controller;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.levi9.reddit.community.dto.InternalCommunityDTO;
import com.levi9.reddit.community.exception.CommunityNotFoundException;
import com.levi9.reddit.community.exception.GlobalExceptionHandler;
import com.levi9.reddit.community.security.SecurityConfig;
import com.levi9.reddit.community.service.CommunityMembershipService;
import com.levi9.reddit.community.service.CommunityService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(InternalCommunityController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@TestPropertySource(properties = "app.mock-auth.enabled=false")
class InternalCommunityControllerTest {

    private static final long COMMUNITY_ID = 7L;
    private static final long USER_ID = 42L;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CommunityService communityService;

    @MockitoBean
    private CommunityMembershipService membershipService;

    @Test
    void getCommunity_withoutToken_returnsNameAndActiveStatus() throws Exception {
        // No jwt()/user() post-processor: /internal/** must be reachable without a token.
        given(communityService.getActiveById(COMMUNITY_ID))
                .willReturn(new InternalCommunityDTO("backend", true));

        mockMvc.perform(get("/internal/communities/{id}", COMMUNITY_ID))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.name").value("backend"))
                .andExpect(jsonPath("$.active").value(true));

        verify(communityService).getActiveById(COMMUNITY_ID);
    }

    @Test
    void getCommunity_missingOrInactive_returnsProblemDetail404() throws Exception {
        willThrow(new CommunityNotFoundException(COMMUNITY_ID))
                .given(communityService).getActiveById(COMMUNITY_ID);

        mockMvc.perform(get("/internal/communities/{id}", COMMUNITY_ID))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errorType").value("COMMUNITY_NOT_FOUND"));
    }

    @Test
    void isMember_member_returnsNoContent() throws Exception {
        given(membershipService.isMember(COMMUNITY_ID, USER_ID)).willReturn(true);

        mockMvc.perform(get("/internal/communities/{id}/members/{userId}", COMMUNITY_ID, USER_ID))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
    }

    @Test
    void isMember_nonMember_returnsNotFound() throws Exception {
        given(membershipService.isMember(COMMUNITY_ID, USER_ID)).willReturn(false);

        mockMvc.perform(get("/internal/communities/{id}/members/{userId}", COMMUNITY_ID, USER_ID))
                .andExpect(status().isNotFound());
    }

    @Test
    void isMember_missingOrInactiveCommunity_returnsProblemDetail404() throws Exception {
        willThrow(new CommunityNotFoundException(COMMUNITY_ID))
                .given(membershipService).isMember(COMMUNITY_ID, USER_ID);

        mockMvc.perform(get("/internal/communities/{id}/members/{userId}", COMMUNITY_ID, USER_ID))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errorType").value("COMMUNITY_NOT_FOUND"));
    }
}

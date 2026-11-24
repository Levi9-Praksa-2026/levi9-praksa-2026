package com.levi9.reddit.community.security;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.levi9.reddit.community.config.SecurityConfig;
import com.levi9.reddit.community.controller.CommunityController;
import com.levi9.reddit.community.dto.CommunityDetailDTO;
import com.levi9.reddit.community.exception.GlobalExceptionHandler;
import com.levi9.reddit.community.service.CommunityMembershipService;
import com.levi9.reddit.community.service.CommunityService;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** With the local mock caller on, a real token still decides who the caller is; only token-less requests are faked. */
@WebMvcTest(CommunityController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@TestPropertySource(properties = "app.mock-auth.enabled=true")
class CommunityJwtWithMockAuthTest {

    private static final String BODY = """
            {"name":"backend","description":"Backend discussion"}
            """;

    @DynamicPropertySource
    static void keys(DynamicPropertyRegistry registry) {
        registry.add("spring.security.oauth2.resourceserver.jwt.jwk-set-uri", TestTokens::jwkSetUri);
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CommunityService communityService;

    @MockitoBean
    private CommunityMembershipService membershipService;

    @Test
    void userToken_winsOverTheMockAdmin() throws Exception {
        mockMvc.perform(post("/api/communities")
                        .header("Authorization", "Bearer " + TestTokens.token(6, "regular", "USER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isForbidden());
    }

    @Test
    void noToken_stillGetsTheMockAdmin() throws Exception {
        given(communityService.create(anyString(), nullable(String.class), anyLong()))
                .willReturn(new CommunityDetailDTO(1L, "backend", "Backend discussion", 0, Instant.now()));

        mockMvc.perform(post("/api/communities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isCreated());
    }
}

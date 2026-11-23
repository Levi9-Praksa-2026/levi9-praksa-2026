package com.levi9.reddit.community.security;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import org.springframework.test.web.servlet.ResultActions;

/** Real access tokens, checked by the real decoder: signature, issuer, expiry and roles -> ROLE_. Mock caller off. */
@WebMvcTest(CommunityController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@TestPropertySource(properties = "app.mock-auth.enabled=false")
class CommunityJwtSecurityTest {

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
    void create_withAdminToken_isCreatedByThatUser() throws Exception {
        given(communityService.create(anyString(), nullable(String.class), eq(5L)))
                .willReturn(new CommunityDetailDTO(1L, "backend", "Backend discussion", 0, Instant.now()));

        create(TestTokens.token(5, "admin", "ADMIN")).andExpect(status().isCreated());
    }

    @Test
    void create_withUserToken_isForbidden() throws Exception {
        create(TestTokens.token(6, "regular", "USER"))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Access is denied"));
        verifyNoInteractions(communityService);
    }

    @Test
    void create_withTokenFromAnotherIssuer_isUnauthorized() throws Exception {
        expectUnauthorized(create(TestTokens.tokenFromIssuer("http://evil.example", "ADMIN")));
    }

    @Test
    void create_withExpiredToken_isUnauthorized() throws Exception {
        expectUnauthorized(create(TestTokens.expiredToken("ADMIN")));
    }

    @Test
    void create_withGarbageToken_isUnauthorized() throws Exception {
        expectUnauthorized(create("not-a-jwt"));
    }

    private ResultActions create(String token) throws Exception {
        return mockMvc.perform(post("/api/communities")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY));
    }

    private void expectUnauthorized(ResultActions result) throws Exception {
        result.andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Authentication is required"))
                .andExpect(jsonPath("$.instance").value("/api/communities"));
        verifyNoInteractions(communityService);
    }
}

package com.levi9.reddit.post.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Real access tokens, checked by the real decoder: signature, issuer and expiry. */
class PostJwtSecurityTest {

    @DynamicPropertySource
    static void keys(DynamicPropertyRegistry registry) {
        registry.add("spring.security.oauth2.resourceserver.jwt.jwk-set-uri", TestTokens::jwkSetUri);
    }

    @Nested
    @WebMvcTest(WhoAmIController.class)
    @Import(SecurityConfig.class)
    @TestPropertySource(properties = "app.mock-auth.enabled=false")
    class MockOff {

        @Autowired
        private MockMvc mockMvc;

        @Test
        void validToken_isTheCaller() throws Exception {
            whoAmI(TestTokens.token(7, "ana", "USER"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(7))
                    .andExpect(jsonPath("$.username").value("ana"))
                    .andExpect(jsonPath("$.roles[0]").value("USER"));
        }

        @Test
        void tokenFromAnotherIssuer_isUnauthorized() throws Exception {
            expectUnauthorized(whoAmI(TestTokens.tokenFromIssuer("http://evil.example", "USER")));
        }

        @Test
        void expiredToken_isUnauthorized() throws Exception {
            expectUnauthorized(whoAmI(TestTokens.expiredToken("USER")));
        }

        private ResultActions whoAmI(String token) throws Exception {
            return mockMvc.perform(get(WhoAmIController.PATH).header("Authorization", "Bearer " + token));
        }
    }

    @Nested
    @WebMvcTest(WhoAmIController.class)
    @Import(SecurityConfig.class)
    @TestPropertySource(properties = "app.mock-auth.enabled=true")
    class MockOn {

        @Autowired
        private MockMvc mockMvc;

        @Test
        void realToken_winsOverMockHeaders() throws Exception {
            mockMvc.perform(get(WhoAmIController.PATH)
                            .header("Authorization", "Bearer " + TestTokens.token(7, "ana", "USER"))
                            .header(MockAuthenticationFilter.USER_ID_HEADER, "42")
                            .header(MockAuthenticationFilter.ROLES_HEADER, "ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(7))
                    .andExpect(jsonPath("$.roles[0]").value("USER"));
        }

        @Test
        void invalidToken_isNotRescuedByTheMock() throws Exception {
            expectUnauthorized(mockMvc.perform(get(WhoAmIController.PATH)
                    .header("Authorization", "Bearer " + TestTokens.expiredToken("USER"))));
        }
    }

    private static void expectUnauthorized(ResultActions result) throws Exception {
        result.andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Authentication is required"))
                .andExpect(jsonPath("$.instance").value(WhoAmIController.PATH));
    }
}

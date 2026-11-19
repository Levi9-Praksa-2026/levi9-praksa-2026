package com.levi9.reddit.post.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/** Without the flag (the production default) the X-Mock-* headers must not authenticate anyone. */
@WebMvcTest(WhoAmIController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = "app.mock-auth.enabled=false")
class MockAuthDisabledSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void protectedRoute_withoutCaller_isRejected() throws Exception {
        mockMvc.perform(get(WhoAmIController.PATH))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void mockHeaders_areIgnored() throws Exception {
        mockMvc.perform(get(WhoAmIController.PATH)
                        .header(MockAuthenticationFilter.USER_ID_HEADER, "1")
                        .header(MockAuthenticationFilter.ROLES_HEADER, "ADMIN"))
                .andExpect(status().isUnauthorized());
    }
}

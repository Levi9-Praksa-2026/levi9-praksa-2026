package com.levi9.reddit.community.api;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.levi9.reddit.community.contracts.CommunityDetailResponse;
import com.levi9.reddit.community.contracts.CommunitySort;
import com.levi9.reddit.community.contracts.PageResponse;
import com.levi9.reddit.community.infrastructure.CommunityService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Role and authentication checks with the temporary mock caller switched off. */
@WebMvcTest(CommunityController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@TestPropertySource(properties = "app.mock-auth.enabled=false")
class CommunityAdminSecurityTest {

    private static final String BODY = """
            {"name":"backend","description":"Backend discussion"}
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CommunityService communityService;

    @Test
    void create_withoutCaller_returnsUnauthorizedProblemDetail() throws Exception {
        mockMvc.perform(post("/api/communities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.errorType").doesNotExist());
    }

    @Test
    void create_asUser_returnsForbiddenProblemDetail() throws Exception {
        mockMvc.perform(post("/api/communities")
                        .with(user("regular").roles("USER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.errorType").doesNotExist());
    }

    @Test
    void create_asAdmin_isAllowed() throws Exception {
        given(communityService.create(anyString(), nullable(String.class), anyLong()))
                .willReturn(new CommunityDetailResponse(1L, "backend", "Backend discussion", 0, Instant.now()));

        mockMvc.perform(post("/api/communities")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isCreated());
    }

    @Test
    void patchDeleteAndReactivate_asUser_areForbidden() throws Exception {
        mockMvc.perform(patch("/api/communities/backend")
                        .with(user("regular").roles("USER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"description":"New description"}
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/communities/backend").with(user("regular").roles("USER")))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/communities/backend/reactivate").with(user("regular").roles("USER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void readsStayPublic() throws Exception {
        given(communityService.findCommunities(CommunitySort.NEW, null, 0, 20))
                .willReturn(new PageResponse<>(List.of(), 0, 20, 0, 0));

        mockMvc.perform(get("/api/communities"))
                .andExpect(status().isOk());
    }
}

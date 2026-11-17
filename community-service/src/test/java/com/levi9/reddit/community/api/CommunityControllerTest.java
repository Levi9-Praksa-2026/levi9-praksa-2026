package com.levi9.reddit.community.api;

import com.levi9.reddit.community.contracts.CommunityResponse;
import com.levi9.reddit.community.infrastructure.CommunityService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CommunityController.class)
@AutoConfigureMockMvc(addFilters = false)
class CommunityControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CommunityService communityService;

    @Test
    void returnsCommunityNameAndMemberCount() throws Exception {
        given(communityService.getAll()).willReturn(List.of(
                new CommunityResponse(1L, "backend", 7)));

        mockMvc.perform(get("/api/communities"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].name").value("backend"))
                .andExpect(jsonPath("$[0].memberCount").value(7));
    }

    @Test
    void returnsEmptyArrayWhenThereAreNoCommunities() throws Exception {
        given(communityService.getAll()).willReturn(List.of());

        mockMvc.perform(get("/api/communities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}

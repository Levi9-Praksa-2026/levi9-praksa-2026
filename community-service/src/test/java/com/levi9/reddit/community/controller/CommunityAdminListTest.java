package com.levi9.reddit.community.controller;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.levi9.reddit.community.config.SecurityConfig;
import com.levi9.reddit.community.dto.AdminCommunityDTO;
import com.levi9.reddit.community.dto.CommunitySort;
import com.levi9.reddit.community.dto.PageDTO;
import com.levi9.reddit.community.exception.GlobalExceptionHandler;
import com.levi9.reddit.community.service.CommunityService;
import com.levi9.reddit.community.service.CommunityMembershipService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@WebMvcTest(CommunityController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class CommunityAdminListTest {
    @Autowired MockMvc mvc;
    @MockitoBean CommunityService communities;
    @MockitoBean CommunityMembershipService memberships;

    private static RequestPostProcessor admin() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    @Test void allReturnsMixedRowsWithTheirActualState() throws Exception {
        given(communities.findAdminCommunities(null, CommunitySort.NEW, null, 0, 20)).willReturn(
                new PageDTO<>(List.of(new AdminCommunityDTO("frontend", 5, true),
                        new AdminCommunityDTO("retired", 3, false)), 0, 20, 2, 1));
        mvc.perform(get("/api/communities").param("inactive", "all").with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].active").value(true))
                .andExpect(jsonPath("$.content[1].active").value(false))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test void acceptsFiltersAndPagination() throws Exception {
        for (boolean active : List.of(true, false)) {
            given(communities.findAdminCommunities(active, CommunitySort.TOP, "front", 2, 10))
                    .willReturn(new PageDTO<>(List.of(), 2, 10, 0, 0));
            mvc.perform(get("/api/communities").with(admin())
                            .param("inactive", active ? "false" : "true").param("sort", "top")
                            .param("name", "front").param("page", "2").param("size", "10"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.page").value(2));
        }
    }

    @Test void refusesAnonymousAndRegularUsersBeforeQuerying() throws Exception {
        mvc.perform(get("/api/communities").param("inactive", "all")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/communities").param("inactive", "all").with(jwt())).andExpect(status().isForbidden());
        verifyNoInteractions(communities);
    }

    @Test void rejectsInvalidStatusSortAndPaging() throws Exception {
        for (String parameter : List.of("inactive", "sort", "page", "size")) {
            var request = get("/api/communities").with(admin()).param(parameter, "invalid");
            if (!parameter.equals("inactive")) request.param("inactive", "all");
            mvc.perform(request)
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(communities);
    }
}

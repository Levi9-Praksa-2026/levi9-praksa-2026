package com.levi9.reddit.auth.controller;

import com.levi9.reddit.auth.exception.ConflictException;
import com.levi9.reddit.auth.exception.ErrorType;
import com.levi9.reddit.auth.exception.ForbiddenException;
import com.levi9.reddit.auth.exception.NotFoundException;
import com.levi9.reddit.auth.security.UserApiSecurityConfig;
import com.levi9.reddit.auth.service.UserBanService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Security filters stay on: the token check and the role check are part of what is tested. The real resource server
// chain is loaded; jwt() supplies an already-checked token, so the decoder itself is a mock.
@WebMvcTest(AdminUserController.class)
@Import(UserApiSecurityConfig.class)
class AdminUserControllerTest {
    private static final String BAN_URL = "/api/admin/users/reader/ban";
    private static final String BODY = "{\"reason\":\"spam\"}";

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private UserBanService bans;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    void adminBansUser() throws Exception {
        mvc.perform(post(BAN_URL).with(admin()).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isNoContent());

        verify(bans).ban("reader", 7L, "spam");
    }

    @Test
    void adminUnbansUser() throws Exception {
        mvc.perform(delete(BAN_URL).with(admin()))
                .andExpect(status().isNoContent());

        verify(bans).unban("reader");
    }

    @Test
    void regularUserIsForbidden() throws Exception {
        mvc.perform(post(BAN_URL).with(user()).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isForbidden());
        mvc.perform(delete(BAN_URL).with(user()))
                .andExpect(status().isForbidden());

        verifyNoInteractions(bans);
    }

    @Test
    void withoutATokenBothEndpointsAre401() throws Exception {
        mvc.perform(post(BAN_URL).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete(BAN_URL)).andExpect(status().isUnauthorized());

        verifyNoInteractions(bans);
    }

    @Test
    void rejectsInvalidReason() throws Exception {
        String tooLong = "x".repeat(501);
        for (String body : new String[] {"{}", "{\"reason\":\"   \"}", "{\"reason\":\"" + tooLong + "\"}", "{invalid"}) {
            mvc.perform(post(BAN_URL).with(admin()).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }

        verifyNoInteractions(bans);
    }

    @Test
    void mapsDomainErrorsToProblemDetails() throws Exception {
        doThrow(new NotFoundException(ErrorType.USER_NOT_FOUND, "User not found"))
                .when(bans).ban("ghost", 7L, "spam");
        doThrow(new ForbiddenException(ErrorType.ADMIN_BAN_FORBIDDEN, "Admins cannot be banned"))
                .when(bans).ban("boss", 7L, "spam");
        doThrow(new ConflictException(ErrorType.USER_ALREADY_BANNED, "User is already banned"))
                .when(bans).ban("reader", 7L, "spam");
        doThrow(new ConflictException(ErrorType.USER_NOT_BANNED, "User is not banned"))
                .when(bans).unban("reader");

        mvc.perform(post("/api/admin/users/ghost/ban").with(admin()).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorType").value("USER_NOT_FOUND"));
        mvc.perform(post("/api/admin/users/boss/ban").with(admin()).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorType").value("ADMIN_BAN_FORBIDDEN"));
        mvc.perform(post(BAN_URL).with(admin()).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorType").value("USER_ALREADY_BANNED"));
        mvc.perform(delete(BAN_URL).with(admin()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorType").value("USER_NOT_BANNED"));
    }

    private static RequestPostProcessor admin() {
        return jwt().jwt(j -> j.subject("7")).authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    private static RequestPostProcessor user() {
        return jwt().jwt(j -> j.subject("8")).authorities(new SimpleGrantedAuthority("ROLE_USER"));
    }
}

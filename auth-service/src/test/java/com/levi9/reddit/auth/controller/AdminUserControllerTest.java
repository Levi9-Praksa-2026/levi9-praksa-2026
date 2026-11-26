package com.levi9.reddit.auth.controller;

import com.levi9.reddit.auth.exception.ConflictException;
import com.levi9.reddit.auth.exception.ErrorType;
import com.levi9.reddit.auth.exception.ForbiddenException;
import com.levi9.reddit.auth.exception.NotFoundException;
import com.levi9.reddit.auth.config.UserApiSecurityConfig;
import com.levi9.reddit.auth.service.UserBanService;
import com.levi9.reddit.auth.service.AuthService;
import com.levi9.reddit.auth.dto.RegisterDTO;
import com.levi9.reddit.auth.entity.User;
import com.levi9.reddit.auth.service.UserDirectoryService;
import com.levi9.reddit.auth.dto.AdminUserDTO;
import com.levi9.reddit.auth.dto.PageDTO;
import com.levi9.reddit.auth.entity.UserRole;
import java.time.Instant;
import java.util.List;
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
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
    private UserDirectoryService directory;

    @MockitoBean
    private AuthService accounts;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    void adminCreatesRegularUserWithoutCredentialsInResponse() throws Exception {
        var request = new RegisterDTO("new_user", "new@example.test", "long-demo-password", "New", "User");
        given(accounts.register(request)).willReturn(new User(request.username(), request.email(), "private-hash", "New", "User"));
        mvc.perform(post("/api/admin/users").with(admin()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"new_user\",\"email\":\"new@example.test\",\"password\":\"long-demo-password\",\"firstName\":\"New\",\"lastName\":\"User\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("new_user"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.password").doesNotExist());
        verify(accounts).register(request);
    }

    @Test
    void creationIsAdminOnlyAndValidatesTheRegistrationRules() throws Exception {
        mvc.perform(post("/api/admin/users").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/users").with(user()).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/users").with(admin()).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(accounts);
    }

    @Test
    void adminReadsPaginatedDirectoryWithoutCredentials() throws Exception {
        given(directory.list("reader", "banned", 1, 5)).willReturn(new PageDTO<>(List.of(
                new AdminUserDTO(42L, "reader", "reader@example.test", "First", "Last", UserRole.USER,
                        true, false, "Spam", Instant.EPOCH, Instant.EPOCH)), 1, 5, 6, 2));
        mvc.perform(get("/api/admin/users").with(admin()).param("q", "reader").param("status", "banned")
                        .param("page", "1").param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].username").value("reader"))
                .andExpect(jsonPath("$.content[0].banned").value(true))
                .andExpect(jsonPath("$.content[0].passwordHash").doesNotExist())
                .andExpect(jsonPath("$.content[0].passwordChangedAt").doesNotExist())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    @Test
    void directoryIsAdminOnly() throws Exception {
        mvc.perform(get("/api/admin/users")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/users").with(user())).andExpect(status().isForbidden());
        verifyNoInteractions(directory);
    }

    @Test
    void directoryRejectsInvalidFiltersAndPaging() throws Exception {
        for (String key : List.of("status", "page", "size")) {
            mvc.perform(get("/api/admin/users").with(admin()).param(key, "invalid"))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/admin/users").with(admin()).param("page", "-1")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/users").with(admin()).param("size", "101")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/users").with(admin()).param("q", "x".repeat(255))).andExpect(status().isBadRequest());
        verifyNoInteractions(directory);
    }

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

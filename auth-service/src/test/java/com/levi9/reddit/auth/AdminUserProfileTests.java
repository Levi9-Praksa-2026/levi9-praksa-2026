package com.levi9.reddit.auth;

import com.levi9.reddit.auth.entity.User;
import com.levi9.reddit.auth.entity.UserRole;
import com.levi9.reddit.auth.repository.UserRepository;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class AdminUserProfileTests {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired JdbcTemplate jdbc;
    private User target;
    private User other;
    private static final String URL = "/api/admin/users/reader";
    private static final String BODY = "{\"firstName\":\" Updated \",\"lastName\":\" Name \",\"email\":\" updated@example.test \"}";

    @BeforeEach void seed() {
        jdbc.execute("TRUNCATE oauth2_authorization, users RESTART IDENTITY CASCADE");
        target = users.save(new User("reader", "reader@example.test", "original-hash", "First", "Last"));
        other = users.save(new User("other", "other@example.test", "hash", "Other", "Account"));
    }

    @AfterEach void cleanUp() {
        jdbc.execute("TRUNCATE oauth2_authorization, users RESTART IDENTITY CASCADE");
    }

    @Test void updatesNamesAndEmailWithoutChangingIdentityRoleOrPassword() throws Exception {
        mvc.perform(patch(URL).with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY.substring(0, BODY.length() - 1) + ",\"username\":\"renamed\",\"role\":\"ADMIN\",\"password\":\"new-password\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.username").value("reader"))
                .andExpect(jsonPath("$.firstName").value("Updated"))
                .andExpect(jsonPath("$.email").value("updated@example.test"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
        User saved = users.findById(target.getId()).orElseThrow();
        assertThat(saved.getUsername()).isEqualTo("reader");
        assertThat(saved.getRole()).isEqualTo(UserRole.USER);
        assertThat(saved.getPasswordHash()).isEqualTo("original-hash");
    }

    @Test void duplicateEmailReturnsConflictWithoutSavingOtherChanges() throws Exception {
        mvc.perform(patch(URL).with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY.replace("updated@example.test", "OTHER@example.test")))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.errorType").value("EMAIL_TAKEN"));
        assertThat(users.findById(target.getId()).orElseThrow().getFirstName()).isEqualTo("First");
    }

    @Test void bannedProfilesCanBeEditedAndDeletedProfilesCannot() throws Exception {
        target.ban(other.getId(), "Spam", Instant.now()); users.save(target);
        mvc.perform(patch(URL).with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isOk());
        User saved = users.findById(target.getId()).orElseThrow();
        assertThat(saved.isBanned()).isTrue();
        saved.delete(); users.save(saved);
        mvc.perform(patch(URL).with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isNotFound());
    }

    @Test void editingRequiresAnAdminAndValidProfileFields() throws Exception {
        mvc.perform(patch(URL).contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isUnauthorized());
        mvc.perform(patch(URL).with(jwt()).contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isForbidden());
        for (String invalid : new String[]{"{}", BODY.replace("Updated", ""), BODY.replace("updated@example.test", "invalid")}) {
            mvc.perform(patch(URL).with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                            .contentType(MediaType.APPLICATION_JSON).content(invalid)).andExpect(status().isBadRequest());
        }
        assertThat(users.findById(target.getId()).orElseThrow().getEmail()).isEqualTo("reader@example.test");
    }
}

package com.levi9.reddit.auth;

import com.levi9.reddit.auth.core.model.User;
import com.levi9.reddit.auth.infrastructure.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The ban endpoints through the real resource server: tokens signed with auth-service's own key, as the gateway
 * relays them, and real Postgres. A ban ends the user's logins (their authorizations are deleted); only an admin
 * token may do it, and an unban brings no session back.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class AdminBanTests {
    private static final String ISSUER = "http://localhost:3000";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JwtEncoder ourKey;

    @Autowired
    private UserRepository users;

    @Autowired
    private JdbcTemplate jdbc;

    private User admin;
    private User marko;
    private User other;

    @BeforeEach
    void usersWithLogins() {
        jdbc.execute("TRUNCATE oauth2_authorization, users RESTART IDENTITY CASCADE");
        admin = users.save(new User("admin", "admin@example.test", "hash", "Admin", "User"));
        marko = users.save(new User("marko", "marko@example.test", "hash", "Marko", "Markovic"));
        other = users.save(new User("other", "other@example.test", "hash", "Other", "User"));
        insertAuthorization("marko-laptop", marko.getId());
        insertAuthorization("marko-phone", marko.getId());
        insertAuthorization("other-laptop", other.getId());
    }

    @Test
    void anAdminsBanEndsEveryLoginOfThatUserAndNoOneElses() throws Exception {
        ban("marko", token(admin, "ADMIN")).andExpect(status().isNoContent());

        User banned = users.findById(marko.getId()).orElseThrow();
        assertThat(banned.isBanned()).isTrue();
        assertThat(banned.getBannedBy()).isEqualTo(admin.getId());
        assertThat(authorizationIds()).containsExactly("other-laptop");
    }

    @Test
    void aUsersTokenCannotBan() throws Exception {
        ban("marko", token(other, "USER")).andExpect(status().isForbidden());

        assertThat(users.findById(marko.getId()).orElseThrow().isBanned()).isFalse();
        assertThat(authorizationIds()).containsExactlyInAnyOrder("marko-laptop", "marko-phone", "other-laptop");
    }

    @Test
    void withoutATokenNothingHappens() throws Exception {
        mvc.perform(post("/api/users/marko/ban").contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"spam\"}"))
                .andExpect(status().isUnauthorized());

        assertThat(users.findById(marko.getId()).orElseThrow().isBanned()).isFalse();
    }

    @Test
    void anUnbanBringsNoSessionBack() throws Exception {
        String adminToken = token(admin, "ADMIN");
        ban("marko", adminToken).andExpect(status().isNoContent());

        mvc.perform(delete("/api/users/marko/ban").header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        assertThat(users.findById(marko.getId()).orElseThrow().isBanned()).isFalse();
        assertThat(authorizationIds()).containsExactly("other-laptop");
    }

    private ResultActions ban(String username, String bearer) throws Exception {
        return mvc.perform(post("/api/users/{username}/ban", username)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"spam\"}"));
    }

    /** An access token as auth-service issues one: sub = user id, username, roles. */
    private String token(User user, String role) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .subject(String.valueOf(user.getId()))
                .claim("username", user.getUsername())
                .claim("roles", new ArrayList<>(List.of(role)))
                .issuedAt(now)
                .expiresAt(now.plus(Duration.ofMinutes(15)))
                .build();
        return ourKey.encode(JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).build(), claims))
                .getTokenValue();
    }

    /** The minimum Spring's schema requires. The principal name is the user id, as the login stores it. */
    private void insertAuthorization(String id, long userId) {
        jdbc.update("""
                INSERT INTO oauth2_authorization (id, registered_client_id, principal_name, authorization_grant_type)
                VALUES (?, 'client', ?, 'authorization_code')""", id, String.valueOf(userId));
    }

    private List<String> authorizationIds() {
        return jdbc.queryForList("SELECT id FROM oauth2_authorization ORDER BY id", String.class);
    }
}

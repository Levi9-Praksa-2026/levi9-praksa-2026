package com.levi9.reddit.auth;

import com.levi9.reddit.auth.entity.User;
import com.levi9.reddit.auth.entity.UserRole;
import com.levi9.reddit.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/** The dev profile's admin account (DevAdminAccount), with the defaults from application-dev.yml. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@ActiveProfiles("dev")
class DevAdminAccountTests {
    private static final String EMAIL = "admin@levddit.local";

    @Autowired
    private ApplicationRunner createDevAdmin;

    @Autowired
    private UserRepository users;

    @Autowired
    private PasswordEncoder passwords;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void emptyDatabase() {
        jdbc.execute("TRUNCATE oauth2_authorization, users RESTART IDENTITY CASCADE");
    }

    @Test
    void createsOneAdminWithTheConfiguredPassword() throws Exception {
        createDevAdmin.run(new DefaultApplicationArguments());

        User admin = users.findByEmailIgnoringCase(EMAIL).orElseThrow();
        assertThat(admin.getRole()).isEqualTo(UserRole.ADMIN);
        assertThat(admin.getUsername()).isEqualTo("admin");
        assertThat(passwords.matches("admin-password", admin.getPasswordHash())).isTrue();
    }

    @Test
    void aRestartChangesNothing() throws Exception {
        createDevAdmin.run(new DefaultApplicationArguments());
        createDevAdmin.run(new DefaultApplicationArguments());

        assertThat(users.count()).isEqualTo(1);
    }

    @Test
    void anExistingAccountWithThatEmailIsNeverPromoted() throws Exception {
        users.save(new User("someone", EMAIL, "hash", "Some", "One"));

        createDevAdmin.run(new DefaultApplicationArguments());

        assertThat(users.findByEmailIgnoringCase(EMAIL).orElseThrow().getRole()).isEqualTo(UserRole.USER);
        assertThat(users.count()).isEqualTo(1);
    }
}

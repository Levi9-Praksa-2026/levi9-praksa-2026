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

import static org.assertj.core.api.Assertions.assertThat;

/** Production's first admin (BootstrapAdminAccount), against real Postgres, with the settings the secret would hold. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = {
        "app.bootstrap-admin.username=siteadmin",
        "app.bootstrap-admin.email=admin@levddit.example",
        "app.bootstrap-admin.password=bootstrap-password",
})
class BootstrapAdminAccountTests {
    private static final String EMAIL = "admin@levddit.example";

    @Autowired
    private ApplicationRunner createBootstrapAdmin;

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
    void createsAnAdminWhenThereIsNone() throws Exception {
        createBootstrapAdmin.run(new DefaultApplicationArguments());

        User admin = users.findByEmailIgnoringCase(EMAIL).orElseThrow();
        assertThat(admin.getRole()).isEqualTo(UserRole.ADMIN);
        assertThat(admin.getUsername()).isEqualTo("siteadmin");
        assertThat(passwords.matches("bootstrap-password", admin.getPasswordHash())).isTrue();
    }

    @Test
    void doesNothingOnceAnAdminExists() throws Exception {
        users.save(admin("existing", "existing@levddit.example"));

        createBootstrapAdmin.run(new DefaultApplicationArguments());

        assertThat(users.findByEmailIgnoringCase(EMAIL)).isEmpty();
        assertThat(users.count()).isEqualTo(1);
    }

    @Test
    void aRestartChangesNothing() throws Exception {
        createBootstrapAdmin.run(new DefaultApplicationArguments());
        createBootstrapAdmin.run(new DefaultApplicationArguments());

        assertThat(users.count()).isEqualTo(1);
    }

    @Test
    void aDeletedAdminDoesNotCount() throws Exception {
        User deleted = admin("former", "former@levddit.example");
        deleted.delete();
        users.save(deleted);

        createBootstrapAdmin.run(new DefaultApplicationArguments());

        assertThat(users.findByEmailIgnoringCase(EMAIL).orElseThrow().getRole()).isEqualTo(UserRole.ADMIN);
    }

    @Test
    void anExistingAccountWithThatEmailIsNeverPromoted() throws Exception {
        users.save(new User("someone", EMAIL, "hash", "Some", "One"));

        createBootstrapAdmin.run(new DefaultApplicationArguments());

        assertThat(users.findByEmailIgnoringCase(EMAIL).orElseThrow().getRole()).isEqualTo(UserRole.USER);
        assertThat(users.count()).isEqualTo(1);
    }

    @Test
    void anExistingAccountWithThatUsernameIsNeverPromoted() throws Exception {
        users.save(new User("siteadmin", "someone@levddit.example", "hash", "Some", "One"));

        createBootstrapAdmin.run(new DefaultApplicationArguments());

        assertThat(users.findByUsernameIgnoringCase("siteadmin").orElseThrow().getRole()).isEqualTo(UserRole.USER);
        assertThat(users.count()).isEqualTo(1);
    }

    private static User admin(String username, String email) {
        User user = new User(username, email, "hash", "Ad", "Min");
        user.grantAdmin();
        return user;
    }
}

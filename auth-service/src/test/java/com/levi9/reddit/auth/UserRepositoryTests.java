package com.levi9.reddit.auth;

import com.levi9.reddit.auth.entity.User;
import com.levi9.reddit.auth.repository.UserRepository;
import com.levi9.reddit.auth.service.UserDirectoryService;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Case-insensitive lookups against the real schema. Not @Transactional: every save commits, so the
 * lookups read what the database actually holds, including its unique indexes.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class UserRepositoryTests {

    @Autowired
    private UserRepository users;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private UserDirectoryService directory;

    @BeforeEach
    void cleanTables() {
        jdbc.execute("TRUNCATE oauth2_authorization, users RESTART IDENTITY CASCADE");
    }

    @Test
    void directoryPaginatesAllStatesWithAStableTieBreaker() {
        User admin = user("admin", "admin@example.test"); admin.grantAdmin(); admin = users.save(admin);
        User active = users.save(user("active", "active@example.test"));
        User banned = user("banned", "banned@example.test"); banned.ban(admin.getId(), "Spam", Instant.now()); users.save(banned);
        User deleted = user("deleted", "deleted@example.test"); deleted.delete(); users.save(deleted);
        jdbc.execute("UPDATE users SET created_at = '2026-01-01T00:00:00Z'::timestamptz");

        var first = directory.list(null, null, 0, 2);
        var second = directory.list(null, null, 1, 2);
        assertThat(first.totalElements()).isEqualTo(4);
        assertThat(first.totalPages()).isEqualTo(2);
        assertThat(first.content()).extracting(u -> u.username()).containsExactly("deleted", "banned");
        assertThat(second.content()).extracting(u -> u.username()).containsExactly("active", "admin");
        assertThat(first.content().get(1).banReason()).isEqualTo("Spam");
        assertThat(directory.list(null, "active", 0, 10).totalElements()).isEqualTo(2);
        assertThat(directory.list(null, "banned", 0, 10).content()).extracting(u -> u.username()).containsExactly("banned");
        assertThat(directory.list(null, "deleted", 0, 10).content()).extracting(u -> u.username()).containsExactly("deleted");
    }

    @Test
    void directorySearchIsCaseInsensitiveAndTreatsWildcardsLiterally() {
        users.save(user("alpha_one", "one@example.test"));
        users.save(user("alphaXone", "two@example.test"));
        users.save(new User("special", "percent%tag@example.test", "hash", "Alexandra", "Petrovic"));

        assertThat(directory.list(" ALPHA_ONE ", null, 0, 10).content()).extracting(u -> u.username()).containsExactly("alpha_one");
        assertThat(directory.list("%", null, 0, 10).content()).extracting(u -> u.username()).containsExactly("special");
        assertThat(directory.list("ALEXANDRA", null, 0, 10).totalElements()).isEqualTo(1);
        assertThat(directory.list("petrovic", null, 0, 10).totalElements()).isEqualTo(1);
        assertThat(directory.list("two@example", null, 0, 10).content()).extracting(u -> u.username()).containsExactly("alphaXone");
        assertThat(directory.list("missing", null, 0, 10).totalElements()).isZero();
    }

    @Test
    void findsAUserByEmailIgnoringCase() {
        users.save(user("Marko", "Marko@Example.test"));

        assertThat(users.findByEmailIgnoringCase("marko@example.TEST"))
                .hasValueSatisfying(found -> assertThat(found.getUsername()).isEqualTo("Marko"));
        assertThat(users.findByEmailIgnoringCase("ana@example.test")).isEmpty();
    }

    @Test
    void findsAUserByUsernameIgnoringCase() {
        users.save(user("Marko", "marko@example.test"));

        assertThat(users.findByUsernameIgnoringCase("mARKO"))
                .hasValueSatisfying(found -> assertThat(found.getUsername()).isEqualTo("Marko"));
    }

    @Test
    void findsNothingForAnUnknownUsername() {
        users.save(user("Marko", "marko@example.test"));

        assertThat(users.findByUsernameIgnoringCase("ana")).isEmpty();
    }

    @Test
    void reportsATakenUsernameIgnoringCase() {
        users.save(user("Marko", "marko@example.test"));

        assertThat(users.existsByUsernameIgnoringCase("MARKO")).isTrue();
        assertThat(users.existsByUsernameIgnoringCase("ana")).isFalse();
    }

    @Test
    void reportsATakenEmailIgnoringCase() {
        users.save(user("Marko", "Marko@Example.test"));

        assertThat(users.existsByEmailIgnoringCase("marko@example.TEST")).isTrue();
        assertThat(users.existsByEmailIgnoringCase("ana@example.test")).isFalse();
    }

    @Test
    void keepsTheUsernameAndEmailOfADeletedUserTaken() {
        User deleted = user("Marko", "marko@example.test");
        deleted.delete();
        users.save(deleted);

        assertThat(users.existsByUsernameIgnoringCase("marko")).isTrue();
        assertThat(users.existsByEmailIgnoringCase("marko@example.test")).isTrue();
        assertThat(users.findByUsernameIgnoringCase("marko"))
                .hasValueSatisfying(found -> assertThat(found.isDeleted()).isTrue());
        assertThat(users.findByEmailIgnoringCase("marko@example.test"))
                .hasValueSatisfying(found -> assertThat(found.isDeleted()).isTrue());
    }

    @Test
    void databaseRejectsAUsernameThatDiffersOnlyInCase() {
        // The backstop for two registrations racing past the "is it taken?" check at the same moment.
        users.save(user("Marko", "marko@example.test"));

        assertThatThrownBy(() -> users.saveAndFlush(user("marko", "other@example.test")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private static User user(String username, String email) {
        return new User(username, email, "hash", "First", "Last");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "m", "me", "😀😀"})
    void databaseRejectsShortUsernamesInsertedDirectly(String username) {
        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO users (username, email, password_hash, first_name, last_name)
                VALUES (?, 'user@example.test', 'hash', 'First', 'Last')
                """, username))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_users_username_min_length");
    }

    @Test
    void databaseAcceptsAThreeCharacterUsername() {
        users.saveAndFlush(user("mem", "user@example.test"));

        assertThat(users.findByUsernameIgnoringCase("mem")).isPresent();
    }
}

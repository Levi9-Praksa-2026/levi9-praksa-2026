package com.levi9.reddit.auth;

import com.levi9.reddit.auth.core.model.RefreshToken;
import com.levi9.reddit.auth.core.model.User;
import com.levi9.reddit.auth.core.model.UserRole;
import com.levi9.reddit.auth.infrastructure.repository.RefreshTokenRepository;
import com.levi9.reddit.auth.infrastructure.repository.UserRepository;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class AuthServiceApplicationTests {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    void persistsAndReloadsServiceModels() {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        User admin = userRepository.save(new User("admin", "admin@example.test", "hash", "Admin", "User"));
        User user = userRepository.save(new User("reader", "reader@example.test", "hash", "First", "Last"));
        user.ban(admin.getId(), "reason", now);
        RefreshToken token = refreshTokenRepository.save(new RefreshToken(user.getId(), "token-hash", now.plusSeconds(60)));
        token.revoke(now);

        entityManager.flush();
        entityManager.clear();

        User stored = userRepository.findById(user.getId()).orElseThrow();
        assertThat(stored.getUsername()).isEqualTo("reader");
        assertThat(stored.getEmail()).isEqualTo("reader@example.test");
        assertThat(stored.getPasswordHash()).isEqualTo("hash");
        assertThat(stored.getFirstName()).isEqualTo("First");
        assertThat(stored.getLastName()).isEqualTo("Last");
        assertThat(stored.getRole()).isEqualTo(UserRole.USER);
        assertThat(stored.isDeleted()).isFalse();
        assertThat(stored.isBanned()).isTrue();
        assertThat(stored.getBanReason()).isEqualTo("reason");
        assertThat(stored.getBannedAt()).isEqualTo(now);
        assertThat(stored.getBannedBy()).isEqualTo(admin.getId());

        RefreshToken storedToken = refreshTokenRepository.findById(token.getId()).orElseThrow();
        assertThat(storedToken.getUserId()).isEqualTo(user.getId());
        assertThat(storedToken.getTokenHash()).isEqualTo("token-hash");
        assertThat(storedToken.getExpiresAt()).isEqualTo(now.plusSeconds(60));
        assertThat(storedToken.getRevokedAt()).isEqualTo(now);

        stored.unban();
        entityManager.flush();
        entityManager.clear();
        User unbanned = userRepository.findById(user.getId()).orElseThrow();
        assertThat(unbanned.isBanned()).isFalse();
        assertThat(unbanned.getBannedBy()).isNull();
    }
}

package com.levi9.reddit.auth;

import com.levi9.reddit.auth.core.model.RefreshToken;
import com.levi9.reddit.auth.core.model.User;
import com.levi9.reddit.auth.infrastructure.repository.RefreshTokenRepository;
import com.levi9.reddit.auth.infrastructure.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

/** Refresh-token queries against the real schema. Each write runs in its own committed transaction. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class RefreshTokenRepositoryTests {
    private static final Instant NOW = Instant.now().truncatedTo(ChronoUnit.MICROS);

    @Autowired
    private RefreshTokenRepository tokens;

    @Autowired
    private UserRepository users;

    @Autowired
    private TransactionTemplate transaction;

    @Autowired
    private JdbcTemplate jdbc;

    private Long userId;

    @BeforeEach
    void cleanTablesAndCreateUser() {
        jdbc.execute("TRUNCATE refresh_tokens, users RESTART IDENTITY CASCADE");
        userId = users.save(new User("marko", "marko@example.test", "hash", "First", "Last")).getId();
    }

    @Test
    void findsATokenByItsHash() {
        tokens.save(new RefreshToken(userId, "hash-a", NOW.plusSeconds(3600)));

        assertThat(tokens.findByTokenHash("hash-a"))
                .hasValueSatisfying(found -> assertThat(found.getUserId()).isEqualTo(userId));
        assertThat(tokens.findByTokenHash("unknown")).isEmpty();
    }

    @Test
    void revokesAnActiveTokenExactlyOnce() {
        tokens.save(new RefreshToken(userId, "hash-a", NOW.plusSeconds(3600)));

        assertThat(revokeIfActive("hash-a")).isEqualTo(1);
        assertThat(revokeIfActive("hash-a")).isZero();
        assertThat(tokens.findByTokenHash("hash-a").orElseThrow().getRevokedAt()).isEqualTo(NOW);
    }

    @Test
    void doesNotRevokeAnExpiredToken() {
        tokens.save(new RefreshToken(userId, "hash-a", NOW.minusSeconds(1)));

        assertThat(revokeIfActive("hash-a")).isZero();
        assertThat(tokens.findByTokenHash("hash-a").orElseThrow().getRevokedAt()).isNull();
    }

    @Test
    void letsOnlyOneOfTwoSimultaneousRevokesWin() throws Exception {
        tokens.save(new RefreshToken(userId, "hash-a", NOW.plusSeconds(3600)));
        CountDownLatch start = new CountDownLatch(1);

        try (ExecutorService pool = Executors.newFixedThreadPool(2)) {
            CompletableFuture<Integer> first = CompletableFuture.supplyAsync(() -> awaitThenRevoke(start), pool);
            CompletableFuture<Integer> second = CompletableFuture.supplyAsync(() -> awaitThenRevoke(start), pool);
            start.countDown();

            assertThat(first.get() + second.get()).isEqualTo(1);
        }
    }

    @Test
    void revokesAllActiveTokensOfOneUserOnly() {
        Long otherUserId = users.save(new User("ana", "ana@example.test", "hash", "First", "Last")).getId();
        tokens.save(new RefreshToken(userId, "hash-a", NOW.plusSeconds(3600)));
        tokens.save(new RefreshToken(userId, "hash-b", NOW.plusSeconds(3600)));
        tokens.save(new RefreshToken(otherUserId, "hash-c", NOW.plusSeconds(3600)));

        int revoked = transaction.execute(status -> tokens.revokeAllActiveByUserId(userId, NOW));

        assertThat(revoked).isEqualTo(2);
        assertThat(tokens.findByTokenHash("hash-a").orElseThrow().getRevokedAt()).isNotNull();
        assertThat(tokens.findByTokenHash("hash-b").orElseThrow().getRevokedAt()).isNotNull();
        assertThat(tokens.findByTokenHash("hash-c").orElseThrow().getRevokedAt()).isNull();
    }

    private int revokeIfActive(String tokenHash) {
        return transaction.execute(status -> tokens.revokeIfActive(tokenHash, NOW));
    }

    private int awaitThenRevoke(CountDownLatch start) {
        try {
            start.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
        return revokeIfActive("hash-a");
    }
}

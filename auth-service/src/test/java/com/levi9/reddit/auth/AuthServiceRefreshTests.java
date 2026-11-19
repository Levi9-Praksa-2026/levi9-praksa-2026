package com.levi9.reddit.auth;

import com.levi9.reddit.auth.contracts.AuthResponse;
import com.levi9.reddit.auth.contracts.LoginRequest;
import com.levi9.reddit.auth.contracts.RefreshRequest;
import com.levi9.reddit.auth.contracts.RegisterRequest;
import com.levi9.reddit.auth.core.exception.ConflictException;
import com.levi9.reddit.auth.core.exception.DomainException;
import com.levi9.reddit.auth.core.exception.ErrorType;
import com.levi9.reddit.auth.core.exception.UserBannedException;
import com.levi9.reddit.auth.core.model.RefreshToken;
import com.levi9.reddit.auth.core.model.User;
import com.levi9.reddit.auth.core.service.AuthService;
import com.levi9.reddit.auth.infrastructure.repository.RefreshTokenRepository;
import com.levi9.reddit.auth.infrastructure.repository.UserRepository;
import com.nimbusds.jose.jwk.RSAKey;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Refresh, against real Postgres, following the agreed rules (workspace DECISIONS.md, 2026-11-18):
 * rotation (a refresh token works once), sliding 7-day expiry, a 10-second grace window that answers 409,
 * and reuse after that revoking every refresh token of the user. Time is moved with a test clock.
 */
@Import({TestcontainersConfiguration.class, AuthServiceRefreshTests.TestClock.class})
@SpringBootTest
class AuthServiceRefreshTests {
    private static final String PASSWORD = "correct horse battery";

    @TestConfiguration(proxyBeanMethods = false)
    static class TestClock {
        @Bean
        @Primary
        MutableClock mutableClock() {
            return new MutableClock();
        }
    }

    @Autowired
    private AuthService auth;

    @Autowired
    private UserRepository users;

    @Autowired
    private RefreshTokenRepository refreshTokens;

    @Autowired
    private RSAKey signingKey;

    @Autowired
    private MutableClock clock;

    @Autowired
    private JdbcTemplate jdbc;

    private AuthResponse registered;
    private User marko;

    @BeforeEach
    void cleanTablesAndRegisterMarko() {
        jdbc.execute("TRUNCATE refresh_tokens, users RESTART IDENTITY CASCADE");
        registered = auth.register(new RegisterRequest("marko", "marko@example.test", PASSWORD, "Marko", "Markovic"));
        marko = users.findByUsernameIgnoringCase("marko").orElseThrow();
    }

    // --- Rotation ---

    @Test
    void swapsARefreshTokenForANewPairForTheSameUser() throws Exception {
        AuthResponse refreshed = auth.refresh(new RefreshRequest(registered.refreshToken()));

        // Only the refresh token must change. The access token may be identical: same user, same claims and the
        // same second (the clock is frozen here) give the same RS256 signature.
        assertThat(refreshed.refreshToken()).isNotEqualTo(registered.refreshToken());
        String subject = NimbusJwtDecoder.withPublicKey(signingKey.toRSAPublicKey()).build()
                .decode(refreshed.accessToken()).getSubject();
        assertThat(subject).isEqualTo(String.valueOf(marko.getId()));
    }

    @Test
    void theNewRefreshTokenWorksAndTheOldOneIsRevoked() throws Exception {
        AuthResponse refreshed = auth.refresh(new RefreshRequest(registered.refreshToken()));

        assertThat(stored(registered.refreshToken()).getRevokedAt()).isEqualTo(clock.instant());
        assertThat(auth.refresh(new RefreshRequest(refreshed.refreshToken()))).isNotNull();
    }

    @Test
    void eachRefreshGivesSevenDaysFromThatMoment() throws Exception {
        clock.advance(Duration.ofDays(3));

        AuthResponse refreshed = auth.refresh(new RefreshRequest(registered.refreshToken()));

        assertThat(stored(refreshed.refreshToken()).getExpiresAt()).isEqualTo(clock.instant().plus(Duration.ofDays(7)));
    }

    // --- Grace window and reuse ---

    @Test
    void reusingATokenWithinTenSecondsIsAnsweredWith409AndRevokesNothing() throws Exception {
        AuthResponse winner = auth.refresh(new RefreshRequest(registered.refreshToken()));
        clock.advance(Duration.ofSeconds(9));

        assertThat(refreshFails(registered.refreshToken()).getErrorType()).isEqualTo(ErrorType.REFRESH_IN_PROGRESS);
        assertThat(stored(winner.refreshToken()).getRevokedAt()).isNull();
    }

    @Test
    void reusingATokenAfterTheGraceWindowRevokesEverySessionOfThatUserAndAnswers401() throws Exception {
        AuthResponse otherDevice = auth.login(new LoginRequest("marko@example.test", PASSWORD));
        AuthResponse winner = auth.refresh(new RefreshRequest(registered.refreshToken()));
        clock.advance(Duration.ofSeconds(11));

        assertThat(refreshFails(registered.refreshToken()).getErrorType()).isEqualTo(ErrorType.INVALID_REFRESH_TOKEN);
        // Committed even though refresh failed: read straight from the database.
        assertThat(stored(winner.refreshToken()).getRevokedAt()).isNotNull();
        assertThat(stored(otherDevice.refreshToken()).getRevokedAt()).isNotNull();
    }

    @Test
    void aTokenEndedByRevokeAllAnswers409ForTenSecondsAnd401After() {
        // Known limitation (DECISIONS.md 2026-11-18): a token stores only when it was revoked, not why, so a
        // fresh revoke-all looks like a fresh rotation. Still no new tokens either way; the answer settles to 401.
        AuthResponse winner = auth.refresh(new RefreshRequest(registered.refreshToken()));
        clock.advance(Duration.ofSeconds(11));
        refreshFails(registered.refreshToken()); // reuse: revokes the winner too

        assertThat(refreshFails(winner.refreshToken()).getErrorType()).isEqualTo(ErrorType.REFRESH_IN_PROGRESS);
        clock.advance(Duration.ofSeconds(11));
        assertThat(refreshFails(winner.refreshToken()).getErrorType()).isEqualTo(ErrorType.INVALID_REFRESH_TOKEN);
    }

    @Test
    void reuseByOneUserLeavesOtherUsersSessionsAlone() throws Exception {
        AuthResponse ana = auth.register(new RegisterRequest("ana", "ana@example.test", PASSWORD, "Ana", "Anic"));
        auth.refresh(new RefreshRequest(registered.refreshToken()));
        clock.advance(Duration.ofSeconds(11));

        refreshFails(registered.refreshToken());

        assertThat(stored(ana.refreshToken()).getRevokedAt()).isNull();
    }

    @Test
    void twoSimultaneousRefreshesWithOneTokenGiveOneNewPairAndOne409() throws Exception {
        List<String> outcomes = refreshAtTheSameMoment(registered.refreshToken());

        assertThat(outcomes).containsExactlyInAnyOrder("REFRESHED", "REFRESH_IN_PROGRESS");
        assertThat(refreshTokens.findAll()).filteredOn(token -> token.getRevokedAt() == null).hasSize(1);
    }

    // --- Tokens that can't be used ---

    @Test
    void anUnknownTokenIsAnswered401() {
        assertThat(refreshFails("not-a-token-we-issued").getErrorType()).isEqualTo(ErrorType.INVALID_REFRESH_TOKEN);
    }

    @Test
    void anExpiredTokenIsAnswered401WithoutTouchingOtherSessions() throws Exception {
        clock.advance(Duration.ofDays(6));
        AuthResponse newerLogin = auth.login(new LoginRequest("marko@example.test", PASSWORD));
        clock.advance(Duration.ofDays(2)); // the token from register is now 8 days old

        assertThat(refreshFails(registered.refreshToken()).getErrorType()).isEqualTo(ErrorType.INVALID_REFRESH_TOKEN);
        assertThat(stored(newerLogin.refreshToken()).getRevokedAt()).isNull();
    }

    @Test
    void aBannedUserCannotRefreshAndIsToldTheReason() {
        User admin = users.save(new User("admin", "admin@example.test", "hash", "Admin", "User"));
        User user = users.findById(marko.getId()).orElseThrow();
        user.ban(admin.getId(), "Spam", clock.instant());
        users.save(user);

        DomainException failure = refreshFails(registered.refreshToken());

        assertThat(failure).isInstanceOfSatisfying(UserBannedException.class,
                banned -> assertThat(banned.getBanReason()).isEqualTo("Spam"));
    }

    @Test
    void aDeletedUserCannotRefresh() {
        User user = users.findById(marko.getId()).orElseThrow();
        user.delete();
        users.save(user);

        assertThat(refreshFails(registered.refreshToken()).getErrorType()).isEqualTo(ErrorType.INVALID_REFRESH_TOKEN);
    }

    private DomainException refreshFails(String refreshToken) {
        try {
            auth.refresh(new RefreshRequest(refreshToken));
        } catch (DomainException e) {
            return e;
        }
        throw new AssertionError("refresh should have failed");
    }

    private RefreshToken stored(String refreshToken) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(refreshToken.getBytes(StandardCharsets.UTF_8));
        return refreshTokens.findByTokenHash(HexFormat.of().formatHex(digest)).orElseThrow();
    }

    private List<String> refreshAtTheSameMoment(String refreshToken) throws Exception {
        CountDownLatch start = new CountDownLatch(1);
        try (ExecutorService pool = Executors.newFixedThreadPool(2)) {
            List<Future<String>> futures = new ArrayList<>();
            for (int i = 0; i < 2; i++) {
                futures.add(pool.submit((Callable<String>) () -> {
                    start.await();
                    try {
                        auth.refresh(new RefreshRequest(refreshToken));
                        return "REFRESHED";
                    } catch (ConflictException e) {
                        return e.getErrorType().name();
                    }
                }));
            }
            start.countDown();
            List<String> outcomes = new ArrayList<>();
            for (Future<String> future : futures) {
                outcomes.add(future.get());
            }
            return outcomes;
        }
    }
}

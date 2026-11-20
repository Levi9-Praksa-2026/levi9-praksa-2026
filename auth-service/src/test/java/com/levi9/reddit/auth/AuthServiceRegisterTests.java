package com.levi9.reddit.auth;

import com.levi9.reddit.auth.contracts.AuthResponse;
import com.levi9.reddit.auth.contracts.RegisterRequest;
import com.levi9.reddit.auth.core.exception.ConflictException;
import com.levi9.reddit.auth.core.exception.ErrorType;
import com.levi9.reddit.auth.core.model.RefreshToken;
import com.levi9.reddit.auth.core.model.User;
import com.levi9.reddit.auth.core.model.UserRole;
import com.levi9.reddit.auth.core.service.AuthService;
import com.levi9.reddit.auth.infrastructure.repository.RefreshTokenRepository;
import com.levi9.reddit.auth.infrastructure.repository.UserRepository;
import com.nimbusds.jose.jwk.RSAKey;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

/**
 * Register, against real Postgres, following the agreed rules (workspace DECISIONS.md, 2026-11-18):
 * a new account is a USER and is logged in straight away; a taken username may be named; a taken email
 * must never be named. Each call commits, and results are read back from the database.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class AuthServiceRegisterTests {
    private static final String PASSWORD = "correct horse battery";

    @Autowired
    private AuthService auth;

    @Autowired
    private UserRepository users;

    @Autowired
    private RefreshTokenRepository refreshTokens;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private RSAKey signingKey;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void cleanTables() {
        jdbc.execute("TRUNCATE refresh_tokens, users RESTART IDENTITY CASCADE");
    }

    @Test
    void createsAUserAccountWithTheGivenDetails() {
        auth.register(request("Marko_92", "Marko@Example.test"));

        User saved = users.findByUsernameIgnoringCase("marko_92").orElseThrow();
        assertThat(saved.getUsername()).isEqualTo("Marko_92");
        assertThat(saved.getEmail()).isEqualTo("Marko@Example.test");
        assertThat(saved.getFirstName()).isEqualTo("Marko");
        assertThat(saved.getLastName()).isEqualTo("Markovic");
        assertThat(saved.getRole()).isEqualTo(UserRole.USER);
        assertThat(saved.isBanned()).isFalse();
        assertThat(saved.isDeleted()).isFalse();
    }

    @Test
    void storesOnlyAHashOfThePassword() {
        auth.register(request("marko", "marko@example.test"));

        String stored = users.findByUsernameIgnoringCase("marko").orElseThrow().getPasswordHash();
        assertThat(stored).isNotEqualTo(PASSWORD).doesNotContain(PASSWORD);
        assertThat(passwordEncoder.matches(PASSWORD, stored)).isTrue();
    }

    @Test
    void logsTheNewUserInWithAnAccessTokenForThatUser() {
        AuthResponse response = auth.register(request("marko", "marko@example.test"));

        User saved = users.findByUsernameIgnoringCase("marko").orElseThrow();
        Jwt jwt = decode(response.accessToken());
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.expiresIn()).isEqualTo(Duration.ofMinutes(15).toSeconds());
        assertThat(jwt.getSubject()).isEqualTo(String.valueOf(saved.getId()));
        assertThat(jwt.getClaimAsString("username")).isEqualTo("marko");
        assertThat(jwt.getClaimAsStringList("roles")).containsExactly("USER");
    }

    @Test
    void storesTheRefreshTokenOnlyAsAHashValidForSevenDays() throws Exception {
        AuthResponse response = auth.register(request("marko", "marko@example.test"));

        User saved = users.findByUsernameIgnoringCase("marko").orElseThrow();
        RefreshToken stored = refreshTokens.findByTokenHash(sha256Hex(response.refreshToken())).orElseThrow();
        assertThat(stored.getUserId()).isEqualTo(saved.getId());
        assertThat(stored.getRevokedAt()).isNull();
        assertThat(stored.getExpiresAt()).isCloseTo(Instant.now().plus(Duration.ofDays(7)), within(Duration.ofMinutes(1)));
        assertThat(refreshTokens.findByTokenHash(response.refreshToken())).isEmpty();
    }

    @Test
    void rejectsATakenUsernameIgnoringCaseAndSavesNothing() {
        auth.register(request("Marko", "marko@example.test"));

        assertThatThrownBy(() -> auth.register(request("mARKO", "other@example.test")))
                .isInstanceOfSatisfying(ConflictException.class,
                        e -> assertThat(e.getErrorType()).isEqualTo(ErrorType.USERNAME_TAKEN));
        assertThat(users.count()).isEqualTo(1);
        assertThat(refreshTokens.count()).isEqualTo(1);
    }

    @Test
    void rejectsATakenEmailIgnoringCaseWithoutRevealingIt() {
        auth.register(request("marko", "marko@example.test"));

        assertThatThrownBy(() -> auth.register(request("ana", "MARKO@example.test")))
                .isInstanceOfSatisfying(ConflictException.class, e -> {
                    assertThat(e.getErrorType()).isEqualTo(ErrorType.REGISTRATION_FAILED);
                    assertThat(e.getMessage()).doesNotContainIgnoringCase("email")
                            .doesNotContainIgnoringCase("marko@example.test");
                });
        assertThat(users.count()).isEqualTo(1);
    }

    @Test
    void namesTheUsernameWhenBothUsernameAndEmailAreTaken() {
        auth.register(request("marko", "marko@example.test"));

        assertThatThrownBy(() -> auth.register(request("marko", "marko@example.test")))
                .isInstanceOfSatisfying(ConflictException.class,
                        e -> assertThat(e.getErrorType()).isEqualTo(ErrorType.USERNAME_TAKEN));
    }

    @Test
    void twoSimultaneousRegistrationsOfOneUsernameGiveOneAccountAndOneConflict() throws Exception {
        List<Outcome> outcomes = registerAtTheSameMoment(
                request("marko", "first@example.test"), request("MARKO", "second@example.test"));

        assertThat(outcomes).containsExactlyInAnyOrder(Outcome.CREATED, Outcome.USERNAME_TAKEN);
        assertThat(users.count()).isEqualTo(1);
    }

    @Test
    void twoSimultaneousRegistrationsOfOneEmailGiveOneAccountAndOneHiddenConflict() throws Exception {
        List<Outcome> outcomes = registerAtTheSameMoment(
                request("marko", "same@example.test"), request("ana", "SAME@example.test"));

        assertThat(outcomes).containsExactlyInAnyOrder(Outcome.CREATED, Outcome.REGISTRATION_FAILED);
        assertThat(users.count()).isEqualTo(1);
    }

    private enum Outcome { CREATED, USERNAME_TAKEN, REGISTRATION_FAILED }

    /** Both requests start together; BCrypt between the checks and the insert makes them overlap. */
    private List<Outcome> registerAtTheSameMoment(RegisterRequest first, RegisterRequest second) throws Exception {
        CountDownLatch start = new CountDownLatch(1);
        try (ExecutorService pool = Executors.newFixedThreadPool(2)) {
            List<Future<Outcome>> futures = new ArrayList<>();
            for (RegisterRequest request : List.of(first, second)) {
                futures.add(pool.submit((Callable<Outcome>) () -> {
                    start.await();
                    try {
                        auth.register(request);
                        return Outcome.CREATED;
                    } catch (ConflictException e) {
                        return Outcome.valueOf(e.getErrorType().name());
                    }
                }));
            }
            start.countDown();
            List<Outcome> outcomes = new ArrayList<>();
            for (Future<Outcome> future : futures) {
                try {
                    outcomes.add(future.get());
                } catch (ExecutionException e) {
                    throw new AssertionError("registration failed with something other than a 409", e.getCause());
                }
            }
            return outcomes;
        }
    }

    private static RegisterRequest request(String username, String email) {
        return new RegisterRequest(username, email, PASSWORD, "Marko", "Markovic");
    }

    private Jwt decode(String accessToken) {
        try {
            return NimbusJwtDecoder.withPublicKey(signingKey.toRSAPublicKey()).build().decode(accessToken);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static String sha256Hex(String value) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(digest);
    }
}

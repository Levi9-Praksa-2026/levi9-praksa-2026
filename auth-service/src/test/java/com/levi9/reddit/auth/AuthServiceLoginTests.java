package com.levi9.reddit.auth;

import com.levi9.reddit.auth.contracts.AuthResponse;
import com.levi9.reddit.auth.contracts.LoginRequest;
import com.levi9.reddit.auth.contracts.RegisterRequest;
import com.levi9.reddit.auth.core.exception.ErrorType;
import com.levi9.reddit.auth.core.exception.UnauthorizedException;
import com.levi9.reddit.auth.core.exception.UserBannedException;
import com.levi9.reddit.auth.core.model.User;
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
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * Login, against real Postgres, following the agreed rules (workspace DECISIONS.md, 2026-11-18):
 * login is by email; unknown email, wrong password and deleted account are indistinguishable; a banned user
 * learns about the ban only with the right password. Users are created through register, the real path.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class AuthServiceLoginTests {
    private static final String PASSWORD = "correct horse battery";

    @Autowired
    private AuthService auth;

    @Autowired
    private UserRepository users;

    @Autowired
    private RefreshTokenRepository refreshTokens;

    @Autowired
    private RSAKey signingKey;

    @Autowired
    private JdbcTemplate jdbc;

    // A spy only counts calls: every hash and check still runs for real.
    @MockitoSpyBean
    private PasswordEncoder passwordEncoder;

    private User marko;

    @BeforeEach
    void cleanTablesAndRegisterMarko() {
        jdbc.execute("TRUNCATE refresh_tokens, users RESTART IDENTITY CASCADE");
        auth.register(new RegisterRequest("marko", "Marko@Example.test", PASSWORD, "Marko", "Markovic"));
        marko = users.findByUsernameIgnoringCase("marko").orElseThrow();
    }

    @Test
    void logsInWithEmailIgnoringCaseAndTheRightPassword() throws Exception {
        AuthResponse response = auth.login(new LoginRequest("marko@EXAMPLE.test", PASSWORD));

        String subject = NimbusJwtDecoder.withPublicKey(signingKey.toRSAPublicKey()).build()
                .decode(response.accessToken()).getSubject();
        assertThat(subject).isEqualTo(String.valueOf(marko.getId()));
        assertThat(response.tokenType()).isEqualTo("Bearer");
    }

    @Test
    void everyLoginStartsItsOwnSessionWithoutEndingTheOthers() {
        AuthResponse laptop = auth.login(new LoginRequest("marko@example.test", PASSWORD));
        AuthResponse phone = auth.login(new LoginRequest("marko@example.test", PASSWORD));

        assertThat(laptop.refreshToken()).isNotEqualTo(phone.refreshToken());
        assertThat(refreshTokens.findAll()).hasSize(3) // register + two logins
                .allSatisfy(token -> assertThat(token.getRevokedAt()).isNull());
    }

    @Test
    void wrongPasswordUnknownEmailAndDeletedAccountGetTheSameAnswer() {
        UnauthorizedException wrongPassword = loginFails("marko@example.test", "not the right password");
        UnauthorizedException unknownEmail = loginFails("nobody@example.test", PASSWORD);
        markoIsDeleted();
        UnauthorizedException deleted = loginFails("marko@example.test", PASSWORD);

        for (UnauthorizedException failure : new UnauthorizedException[] {wrongPassword, unknownEmail, deleted}) {
            assertThat(failure.getErrorType()).isEqualTo(ErrorType.INVALID_CREDENTIALS);
            assertThat(failure.getMessage()).isEqualTo(wrongPassword.getMessage());
        }
    }

    @Test
    void anUnknownEmailCostsTheSamePasswordCheckAsAKnownOne() {
        // Timing: skipping BCrypt for unknown emails would make them answer ~50 ms faster than known ones.
        clearInvocations(passwordEncoder);
        loginFails("nobody@example.test", PASSWORD);
        verify(passwordEncoder, times(1)).matches(anyString(), anyString());

        clearInvocations(passwordEncoder);
        loginFails("marko@example.test", "not the right password");
        verify(passwordEncoder, times(1)).matches(anyString(), anyString());
    }

    @Test
    void aFailedLoginStartsNoSession() {
        long sessionsBefore = refreshTokens.count();

        loginFails("marko@example.test", "not the right password");

        assertThat(refreshTokens.count()).isEqualTo(sessionsBefore);
    }

    @Test
    void aBannedUserWithTheRightPasswordIsToldTheReason() {
        markoIsBanned("Spam");
        long sessionsBefore = refreshTokens.count();

        assertThatThrownBy(() -> auth.login(new LoginRequest("marko@example.test", PASSWORD)))
                .isInstanceOfSatisfying(UserBannedException.class, e -> {
                    assertThat(e.getErrorType()).isEqualTo(ErrorType.USER_BANNED);
                    assertThat(e.getBanReason()).isEqualTo("Spam");
                });
        assertThat(refreshTokens.count()).isEqualTo(sessionsBefore); // no session for a banned user
    }

    @Test
    void aBannedUserWithTheWrongPasswordLearnsNothingAboutTheBan() {
        markoIsBanned("Spam");

        assertThat(loginFails("marko@example.test", "not the right password").getErrorType())
                .isEqualTo(ErrorType.INVALID_CREDENTIALS);
    }

    @Test
    void aPasswordLongerThan72BytesIsWrongEvenIfItStartsWithTheRightOne() {
        // BCrypt alone would accept this: it only reads the first 72 bytes.
        registerWithPassword("ana", "ana@example.test", "a".repeat(72));

        assertThat(loginFails("ana@example.test", "a".repeat(73)).getErrorType())
                .isEqualTo(ErrorType.INVALID_CREDENTIALS);
        assertThat(auth.login(new LoginRequest("ana@example.test", "a".repeat(72)))).isNotNull();
    }

    private UnauthorizedException loginFails(String email, String password) {
        try {
            auth.login(new LoginRequest(email, password));
        } catch (UnauthorizedException e) {
            return e;
        }
        throw new AssertionError("login should have failed for " + email);
    }

    private User registerWithPassword(String username, String email, String password) {
        auth.register(new RegisterRequest(username, email, password, "Ana", "Anic"));
        return users.findByUsernameIgnoringCase(username).orElseThrow();
    }

    private void markoIsDeleted() {
        User user = users.findById(marko.getId()).orElseThrow();
        user.delete();
        users.save(user);
    }

    private void markoIsBanned(String reason) {
        User admin = registerWithPassword("admin", "admin@example.test", PASSWORD);
        User user = users.findById(marko.getId()).orElseThrow();
        user.ban(admin.getId(), reason, Instant.now());
        users.save(user);
    }
}

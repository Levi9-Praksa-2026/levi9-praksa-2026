package com.levi9.reddit.auth;

import com.levi9.reddit.auth.security.AuthorizationCleanup;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "app.oauth.authorization-cleanup.enabled=false")
class AuthorizationCleanupTests {
    private static final Instant NOW = Instant.parse("2026-01-01T00:00:00Z");
    private static final Instant CUTOFF = NOW.minusSeconds(5 * 60);

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void clearAuthorizations() {
        jdbc.execute("TRUNCATE oauth2_authorization");
    }

    @Test
    void removesOnlyRowsWhoseRelevantCredentialExpiredBeyondTheGracePeriod() {
        insert("expired-refresh", "refresh", CUTOFF.minusSeconds(1), NOW.minusSeconds(3600), null, null);
        insert("live-refresh-expired-code", "refresh", NOW.plusSeconds(60), NOW.minusSeconds(3600), null, null);
        insert("expired-code", null, null, CUTOFF.minusSeconds(1), null, null);
        insert("live-code", null, null, NOW.plusSeconds(60), null, null);
        insert("refresh-without-expiry", "refresh", null, CUTOFF.minusSeconds(3600), null, null);
        insert("unknown-expiries", null, null, null, null, null);
        insert("live-access-token", "refresh", CUTOFF.minusSeconds(3600), NOW.minusSeconds(7200),
                NOW.plusSeconds(60), null);
        insert("live-id-token", null, null, CUTOFF.minusSeconds(3600), null, NOW.plusSeconds(60));
        insert("exact-cutoff", "refresh", CUTOFF, null, null, null);
        insert("exact-cutoff-code", null, null, CUTOFF, null, null);
        insert("inside-grace", "refresh", NOW.minusSeconds(4 * 60), null, null, null);
        insert("expired-all-tokens", "refresh", CUTOFF.minusSeconds(3600), NOW.minusSeconds(7200),
                CUTOFF.minusSeconds(3600), CUTOFF.minusSeconds(3600));

        AuthorizationCleanup cleanup = new AuthorizationCleanup(jdbc,
                Clock.fixed(NOW, ZoneOffset.UTC));

        assertThat(cleanup.purgeExpired()).isEqualTo(3);
        assertThat(ids()).containsExactlyInAnyOrder(
                "live-refresh-expired-code", "live-code", "refresh-without-expiry", "unknown-expiries",
                "live-access-token", "live-id-token", "exact-cutoff", "exact-cutoff-code", "inside-grace");
        assertThat(cleanup.purgeExpired()).isZero();
    }

    private void insert(String id, String refreshToken, Instant refreshExpiry, Instant codeExpiry,
                        Instant accessExpiry, Instant idTokenExpiry) {
        jdbc.update("""
                        INSERT INTO oauth2_authorization (
                            id, registered_client_id, principal_name, authorization_grant_type,
                            refresh_token_value, refresh_token_expires_at,
                            authorization_code_value, authorization_code_expires_at,
                            access_token_value, access_token_expires_at, oidc_id_token_value, oidc_id_token_expires_at
                        ) VALUES (?, 'test-client', '1', 'authorization_code', ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                id,
                refreshToken,
                timestamp(refreshExpiry),
                codeExpiry == null ? null : "code",
                timestamp(codeExpiry),
                accessExpiry == null ? null : "access",
                timestamp(accessExpiry),
                idTokenExpiry == null ? null : "id-token",
                timestamp(idTokenExpiry));
    }

    private static java.sql.Timestamp timestamp(Instant value) {
        return value == null ? null : java.sql.Timestamp.from(value);
    }

    private java.util.List<String> ids() {
        return jdbc.queryForList("SELECT id FROM oauth2_authorization ORDER BY id", String.class);
    }
}

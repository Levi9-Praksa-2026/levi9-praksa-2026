package com.levi9.reddit.auth.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;

/** Removes authorizations once their usable tokens have expired. */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.oauth.authorization-cleanup", name = "enabled", havingValue = "true", matchIfMissing = true)
public class AuthorizationCleanup {
    // Give requests already exchanging a code or refreshing a token time to finish.
    private static final Duration GRACE_PERIOD = Duration.ofMinutes(5);

    private final JdbcTemplate jdbc;
    private final Clock clock;

    @Scheduled(cron = "${app.oauth.authorization-cleanup.cron:0 0 0 * * *}", zone = "UTC")
    public void runCleanup() {
        log.info("Purged {} expired OAuth2 authorizations", purgeExpired());
    }

    public int purgeExpired() {
        Timestamp cutoff = Timestamp.from(clock.instant().minus(GRACE_PERIOD));
        return jdbc.update("""
                DELETE FROM oauth2_authorization
                WHERE ((refresh_token_value IS NOT NULL AND refresh_token_expires_at < ?)
                    OR (refresh_token_value IS NULL AND authorization_code_expires_at < ?))
                  AND (access_token_expires_at IS NULL OR access_token_expires_at < ?)
                  AND (oidc_id_token_expires_at IS NULL OR oidc_id_token_expires_at < ?)
                """, cutoff, cutoff, cutoff, cutoff);
    }
}

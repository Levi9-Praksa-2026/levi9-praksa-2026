package com.levi9.reddit.auth.infrastructure.security;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;
import org.springframework.stereotype.Component;

/**
 * Ends a user's logins by deleting their {@code oauth2_authorization} rows: the gateway's next refresh for a deleted
 * row fails with {@code invalid_grant}, so its session ends. Access tokens already issued stay valid until they expire
 * (15 minutes): they are self-contained JWTs.
 * <p>
 * Spring's {@code OAuth2AuthorizationService} has no "remove all for a principal", hence plain SQL. The principal
 * name is the user id (see {@code UserAccountService}). Runs in the caller's transaction.
 */
@Component
public class AuthorizationRevoker {
    private final JdbcTemplate jdbc;
    private final OAuth2AuthorizationService authorizations;

    public AuthorizationRevoker(JdbcTemplate jdbc, OAuth2AuthorizationService authorizations) {
        this.jdbc = jdbc;
        this.authorizations = authorizations;
    }

    /** Every login of the user: account deleted, banned. */
    public int revokeAllOf(long userId) {
        return jdbc.update("DELETE FROM oauth2_authorization WHERE principal_name = ?", String.valueOf(userId));
    }

    /**
     * Every login of the user except the one that sent {@code currentAccessToken}: a password change keeps the
     * session it was made from. The token finds its row (Spring stores each login's current access token in it;
     * refresh rotation changes the tokens, never the row). If the token matches no login of this user, nothing is
     * spared.
     */
    public int revokeAllExcept(long userId, String currentAccessToken) {
        String principal = String.valueOf(userId);
        OAuth2Authorization current = authorizations.findByToken(currentAccessToken, OAuth2TokenType.ACCESS_TOKEN);
        if (current == null || !principal.equals(current.getPrincipalName())) {
            return revokeAllOf(userId);
        }
        return jdbc.update("DELETE FROM oauth2_authorization WHERE principal_name = ? AND id <> ?",
                principal, current.getId());
    }
}

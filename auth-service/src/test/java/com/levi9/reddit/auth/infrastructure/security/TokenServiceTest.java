package com.levi9.reddit.auth.infrastructure.security;

import com.levi9.reddit.auth.core.model.User;
import com.levi9.reddit.auth.core.model.UserRole;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests the token rules the team agreed on, not how TokenService builds them:
 * docs/data-model.md ("Refresh tokens"), docs/security-convention.md ("Access token claims") and the
 * 2026-11-18 decisions (claims, sliding 7-day refresh). Tokens are checked the way consumers see them:
 * the access token through a decoder that only has the public key, as the gateway and services do.
 */
class TokenServiceTest {
    private static final Duration ACCESS_TOKEN_LIFETIME = Duration.ofMinutes(15);
    private static final Duration REFRESH_TOKEN_LIFETIME = Duration.ofDays(7);
    private static final Instant NOW = Instant.now().truncatedTo(ChronoUnit.SECONDS);

    private static final RSAKey SIGNING_KEY = JwtKeyConfig.generate();
    /** What a consumer has: only the public key, as published through JWKS. */
    private static final JwtDecoder CONSUMER = NimbusJwtDecoder.withPublicKey(publicKeyFromJwks()).build();

    private final TokenService tokens = new TokenService(
            new JwtKeyConfig().jwtEncoder(SIGNING_KEY),
            new JwtProperties("levddit-auth", ACCESS_TOKEN_LIFETIME, REFRESH_TOKEN_LIFETIME, null, null, true),
            Clock.fixed(NOW, ZoneOffset.UTC));

    // --- Access token: a JWT any service can verify with the public key alone ---

    @Test
    void accessTokenIsVerifiableWithThePublishedPublicKey() {
        Jwt jwt = CONSUMER.decode(tokens.issue(user(42L, "marko", UserRole.USER)).accessToken());

        assertThat(jwt.getHeaders()).containsEntry("alg", "RS256").containsEntry("kid", SIGNING_KEY.getKeyID());
    }

    @Test
    void accessTokenIdentifiesTheCallerWithTheAgreedClaims() {
        Jwt jwt = CONSUMER.decode(tokens.issue(user(42L, "marko", UserRole.USER)).accessToken());

        assertThat(jwt.getClaimAsString("iss")).isEqualTo("levddit-auth");
        assertThat(jwt.getSubject()).isEqualTo("42");
        assertThat(jwt.getClaimAsString("username")).isEqualTo("marko");
        assertThat(jwt.getClaimAsStringList("roles")).containsExactly("USER");
    }

    @Test
    void accessTokenCarriesTheAdminRoleForAnAdmin() {
        Jwt jwt = CONSUMER.decode(tokens.issue(user(1L, "root", UserRole.ADMIN)).accessToken());

        assertThat(jwt.getClaimAsStringList("roles")).containsExactly("ADMIN");
    }

    @Test
    void accessTokenRolesBecomeSpringAuthoritiesWithTheConventionSettings() {
        // security-convention.md: authorities-claim-name: roles, authority-prefix: ROLE_
        JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName("roles");
        authorities.setAuthorityPrefix("ROLE_");
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);

        Jwt jwt = CONSUMER.decode(tokens.issue(user(1L, "root", UserRole.ADMIN)).accessToken());

        // Not containsExactly: Spring Security 7 also adds FACTOR_BEARER, recording that a bearer token was used.
        assertThat(converter.convert(jwt).getAuthorities())
                .extracting(GrantedAuthority::getAuthority)
                .contains("ROLE_ADMIN")
                .doesNotContain("ROLE_USER");
    }

    @Test
    void accessTokenContainsOnlyTheAgreedClaims() {
        // Every service and the browser can read a JWT, so nothing private (email, password hash) goes in.
        Jwt jwt = CONSUMER.decode(tokens.issue(user(42L, "marko", UserRole.USER)).accessToken());

        assertThat(jwt.getClaims()).containsOnlyKeys("iss", "sub", "username", "roles", "iat", "exp");
        assertThat(jwt.getTokenValue()).doesNotContain("marko@example.test");
    }

    @Test
    void accessTokenLastsFifteenMinutesFromIssue() {
        IssuedTokens issued = tokens.issue(user(42L, "marko", UserRole.USER));
        Jwt jwt = CONSUMER.decode(issued.accessToken());

        assertThat(jwt.getIssuedAt()).isEqualTo(NOW);
        assertThat(jwt.getExpiresAt()).isEqualTo(NOW.plus(ACCESS_TOKEN_LIFETIME));
        assertThat(issued.accessTokenExpiresAt()).isEqualTo(jwt.getExpiresAt());
    }

    // --- Refresh token: random, opaque, ~7 days, stored only as a hash ---

    @Test
    void refreshTokenLastsSevenDaysFromIssue() {
        assertThat(tokens.issue(user(42L, "marko", UserRole.USER)).refreshTokenExpiresAt())
                .isEqualTo(NOW.plus(REFRESH_TOKEN_LIFETIME));
    }

    @Test
    void refreshTokensAreUniqueEvenForTheSameUserAtTheSameMoment() {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 1_000; i++) {
            assertThat(seen.add(tokens.issue(user(42L, "marko", UserRole.USER)).refreshToken())).isTrue();
        }
    }

    @Test
    void refreshTokenIsOpaqueAndSaysNothingAboutTheUser() {
        String refreshToken = tokens.issue(user(42L, "marko", UserRole.USER)).refreshToken();

        // Not a JWT (no dot-separated parts) and no user data inside. The user id isn't checked as text:
        // a random 43-character token contains "42" by chance about 1% of the time.
        assertThat(refreshToken).doesNotContain(".").doesNotContain("marko");
        assertThat(CONSUMER).satisfies(decoder -> assertThatThrownBy(() -> decoder.decode(refreshToken))
                .isInstanceOf(org.springframework.security.oauth2.jwt.JwtException.class));
    }

    @Test
    void storedHashIsTheSha256OfTheRefreshTokenAndFitsTheColumn() throws Exception {
        IssuedTokens issued = tokens.issue(user(42L, "marko", UserRole.USER));

        assertThat(issued.refreshTokenHash())
                .isEqualTo(sha256Hex(issued.refreshToken()))
                .hasSizeLessThanOrEqualTo(64) // refresh_tokens.token_hash is VARCHAR(64)
                .isNotEqualTo(issued.refreshToken());
    }

    @Test
    void hashingTheTokenTheClientSendsBackFindsTheStoredHash() {
        // Refresh looks the token up by hash, so the same token must always give the same hash.
        IssuedTokens issued = tokens.issue(user(42L, "marko", UserRole.USER));

        assertThat(tokens.hash(issued.refreshToken())).isEqualTo(issued.refreshTokenHash());
        assertThat(tokens.hash(issued.refreshToken() + "x")).isNotEqualTo(issued.refreshTokenHash());
    }

    private static User user(Long id, String username, UserRole role) {
        User user = new User(username, username + "@example.test", "hash", "First", "Last");
        // id comes from the database and role has no setter; set them directly for a unit test.
        ReflectionTestUtils.setField(user, "id", id);
        ReflectionTestUtils.setField(user, "role", role);
        return user;
    }

    private static String sha256Hex(String value) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(digest);
    }

    private static java.security.interfaces.RSAPublicKey publicKeyFromJwks() {
        try {
            // Round-trip through the JWKS JSON, exactly what other services receive.
            RSAKey published = JWKSet.parse(new JWKSet(SIGNING_KEY.toPublicJWK()).toString()).getKeys().getFirst().toRSAKey();
            return published.toRSAPublicKey();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}

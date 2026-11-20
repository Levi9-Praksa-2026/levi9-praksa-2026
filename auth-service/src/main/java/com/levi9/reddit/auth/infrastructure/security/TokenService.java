package com.levi9.reddit.auth.infrastructure.security;

import com.levi9.reddit.auth.core.model.User;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

/**
 * Creates the two tokens. The access token is a signed JWT every service can verify on its own.
 * The refresh token is random and opaque: only its SHA-256 hash is stored, so a leaked database can't be
 * used to refresh. Saving and rotating refresh tokens is the caller's job, this class only creates them.
 */
@Service
public class TokenService {
    private static final int REFRESH_TOKEN_BYTES = 32;

    private final JwtEncoder jwtEncoder;
    private final JwtProperties properties;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public TokenService(JwtEncoder jwtEncoder, JwtProperties properties, Clock clock) {
        this.jwtEncoder = jwtEncoder;
        this.properties = properties;
        this.clock = clock;
    }

    public IssuedTokens issue(User user) {
        Instant now = clock.instant();
        Instant accessExpiresAt = now.plus(properties.accessTokenTtl());
        String refreshToken = newRefreshToken();

        return new IssuedTokens(
                accessToken(user, now, accessExpiresAt),
                accessExpiresAt,
                refreshToken,
                hash(refreshToken),
                now.plus(properties.refreshTokenTtl()));
    }

    /** SHA-256 as 64 lowercase hex characters, the form stored in {@code refresh_tokens.token_hash}. */
    public String hash(String refreshToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(refreshToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is required by every Java runtime", e);
        }
    }

    private String accessToken(User user, Instant issuedAt, Instant expiresAt) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(properties.issuer())
                .subject(String.valueOf(user.getId()))
                .claim("username", user.getUsername())
                .claim("roles", List.of(user.getRole().name()))
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .build();
        // The encoder adds the signing key's kid to the header, so services know which JWKS key to use.
        JwsHeader header = JwsHeader.with(SignatureAlgorithm.RS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    private String newRefreshToken() {
        byte[] bytes = new byte[REFRESH_TOKEN_BYTES];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}

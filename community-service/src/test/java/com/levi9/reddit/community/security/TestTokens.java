package com.levi9.reddit.community.security;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

/**
 * Real signed access tokens for tests, shaped like auth-service's ({@code sub}, {@code username}, {@code roles}).
 * The public key is served from a small local HTTP server, so the service's real decoder checks the signature, the
 * issuer and the expiry, exactly as with auth-service. Point {@code jwk-set-uri} at {@link #jwkSetUri()}.
 */
final class TestTokens {
    /** The issuer the test config expects (src/test/resources/application.properties). */
    static final String ISSUER = "http://localhost:3000";

    private static final RSAKey KEY = generateKey();
    private static final HttpServer JWKS = startJwksServer();

    private TestTokens() {}

    static String jwkSetUri() {
        return "http://127.0.0.1:" + JWKS.getAddress().getPort() + "/oauth2/jwks";
    }

    static String token(long userId, String username, String... roles) {
        return sign(userId, username, List.of(roles), ISSUER, Instant.now().plusSeconds(300));
    }

    static String tokenFromIssuer(String issuer, String role) {
        return sign(1, "someone", List.of(role), issuer, Instant.now().plusSeconds(300));
    }

    static String expiredToken(String role) {
        return sign(1, "someone", List.of(role), ISSUER, Instant.now().minusSeconds(300));
    }

    private static String sign(long userId, String username, List<String> roles, String issuer, Instant expiresAt) {
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject(String.valueOf(userId))
                .claim("username", username)
                .claim("roles", roles)
                .issuer(issuer)
                .issueTime(Date.from(expiresAt.minusSeconds(900)))
                .expirationTime(Date.from(expiresAt))
                .build();
        SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(KEY.getKeyID()).build(), claims);
        try {
            jwt.sign(new RSASSASigner(KEY));
        } catch (JOSEException e) {
            throw new IllegalStateException(e);
        }
        return jwt.serialize();
    }

    private static RSAKey generateKey() {
        try {
            return new RSAKeyGenerator(2048).keyID("test-key").generate();
        } catch (JOSEException e) {
            throw new IllegalStateException(e);
        }
    }

    private static HttpServer startJwksServer() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            byte[] body = new JWKSet(KEY.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
            server.createContext("/oauth2/jwks", exchange -> {
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, body.length);
                exchange.getResponseBody().write(body);
                exchange.close();
            });
            server.setExecutor(null);
            server.start(); // runs until the test JVM ends
            return server;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}

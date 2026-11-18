package com.levi9.reddit.gateway;

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
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The gateway's token check against a real JWKS endpoint, standing in for auth-service.
 * Requests go to /internal/check, which has no route: a 404 means the request got past security,
 * a 401 means the gateway rejected the token.
 */
@SpringBootTest
@AutoConfigureMockMvc
class GatewaySecurityTests {
    private static final String UNROUTED_PATH = "/internal/check";
    private static final RSAKey SIGNING_KEY = rsaKey("test-key");
    private static final HttpServer JWKS_SERVER = startJwksServer(SIGNING_KEY);

    @Autowired
    private MockMvc mvc;

    @DynamicPropertySource
    static void pointAtTestJwks(DynamicPropertyRegistry registry) {
        registry.add("spring.security.oauth2.resourceserver.jwt.jwk-set-uri",
                () -> "http://localhost:" + JWKS_SERVER.getAddress().getPort() + "/.well-known/jwks.json");
    }

    @AfterAll
    static void stopJwksServer() {
        JWKS_SERVER.stop(0);
    }

    @Test
    void letsARequestWithoutATokenThrough() throws Exception {
        mvc.perform(get(UNROUTED_PATH)).andExpect(status().isNotFound());
    }

    @Test
    void letsAValidTokenThrough() throws Exception {
        String token = sign(SIGNING_KEY, "levddit-auth", Instant.now().plusSeconds(300));

        mvc.perform(get(UNROUTED_PATH).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void rejectsATokenFromAnotherIssuer() throws Exception {
        expectRejected(sign(SIGNING_KEY, "someone-else", Instant.now().plusSeconds(300)));
    }

    @Test
    void rejectsAnExpiredToken() throws Exception {
        // Beyond the 60 seconds of clock skew the validator allows.
        expectRejected(sign(SIGNING_KEY, "levddit-auth", Instant.now().minusSeconds(120)));
    }

    @Test
    void rejectsATokenSignedWithAnotherKey() throws Exception {
        // Same kid, different key: a forged token that claims to be ours.
        expectRejected(sign(rsaKey("test-key"), "levddit-auth", Instant.now().plusSeconds(300)));
    }

    @Test
    void rejectsSomethingThatIsNotAJwt() throws Exception {
        expectRejected("abc.def.ghi");
    }

    @Test
    void allowsTheFrontendOrigin() throws Exception {
        mvc.perform(options("/api/posts")
                        .header(HttpHeaders.ORIGIN, "http://localhost:3000")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:3000"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, "Location"));
    }

    @Test
    void refusesOtherOrigins() throws Exception {
        mvc.perform(options("/api/posts")
                        .header(HttpHeaders.ORIGIN, "http://evil.test")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    private void expectRejected(String token) throws Exception {
        mvc.perform(get(UNROUTED_PATH).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string(HttpHeaders.WWW_AUTHENTICATE, containsString("invalid_token")));
    }

    private static String sign(RSAKey key, String issuer, Instant expiresAt) throws JOSEException {
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer(issuer)
                .subject("42")
                .claim("username", "marko")
                .claim("roles", List.of("USER"))
                .issueTime(Date.from(expiresAt.minusSeconds(900)))
                .expirationTime(Date.from(expiresAt))
                .build();
        SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID()).build(), claims);
        jwt.sign(new RSASSASigner(key));
        return jwt.serialize();
    }

    private static RSAKey rsaKey(String keyId) {
        try {
            return new RSAKeyGenerator(2048).keyID(keyId).algorithm(JWSAlgorithm.RS256).generate();
        } catch (JOSEException e) {
            throw new IllegalStateException(e);
        }
    }

    private static HttpServer startJwksServer(RSAKey key) {
        byte[] body = new JWKSet(key.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
            server.createContext("/.well-known/jwks.json", exchange -> {
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, body.length);
                try (OutputStream out = exchange.getResponseBody()) {
                    out.write(body);
                }
            });
            server.start();
            return server;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}

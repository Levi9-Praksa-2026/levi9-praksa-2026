package com.levi9.reddit.gateway;

import com.levi9.reddit.gateway.security.OAuthClientConfig;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2RefreshToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.OidcLoginRequestPostProcessor;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Date;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The gateway as a BFF against a stand-in for auth-service and the services behind it (one local HTTP server that
 * records what reaches it), with real Postgres for the sessions.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class GatewayBffTests {
    private static final String PUBLIC_URL = "http://localhost:3000";
    private static final Backend BACKEND = Backend.start();
    private String currentAdminToken;

    @Autowired
    private MockMvc mvc;

    @LocalServerPort
    private int port;

    @Autowired
    private ClientRegistrationRepository registrations;

    @Autowired
    private OAuth2AuthorizedClientRepository authorizedClients;

    /** Raw on purpose: the JDBC session class is package-private, so the interface is the only way in. */
    @SuppressWarnings("rawtypes")
    @Autowired
    private SessionRepository sessions;

    @DynamicPropertySource
    static void routeToTheBackend(DynamicPropertyRegistry registry) {
        for (String service : List.of("AUTH_SERVICE_URL", "COMMUNITY_SERVICE_URL", "POST_SERVICE_URL")) {
            registry.add(service, BACKEND::url);
        }
    }

    @AfterAll
    static void stopBackend() {
        BACKEND.server.stop(0);
    }

    @BeforeEach
    void forgetRequests() {
        BACKEND.authorizationByPath.clear();
        BACKEND.cookieByPath.clear();
    }

    // --- Logging in ---

    @Test
    void startingALoginSendsTheBrowserToAuthServicesPublicAuthorizeUrlWithPkce() throws Exception {
        String location = mvc.perform(get("/oauth2/authorization/levddit"))
                .andExpect(status().is3xxRedirection())
                .andReturn().getResponse().getHeader(HttpHeaders.LOCATION);

        assertThat(location)
                .startsWith(PUBLIC_URL + "/oauth2/authorize?")
                .contains("client_id=levddit-gateway")
                .contains("scope=openid%20profile")
                .contains("redirect_uri=http://localhost:3000/login/oauth2/code/levddit")
                .contains("code_challenge_method=S256");
    }

    @Test
    void aFailedLoginLandsOnTheReactLoginPage() throws Exception {
        // A callback the gateway can't complete (here: no login was started). A refused code exchange ends the same way.
        mvc.perform(get("/login/oauth2/code/levddit").param("code", "c").param("state", "s"))
                .andExpect(status().is3xxRedirection())
                .andExpect(header().string(HttpHeaders.LOCATION, "/signin?error=session-ended"));
    }

    @Test
    void whoIsLoggedInComesFromTheSession() throws Exception {
        mvc.perform(get("/api/me").with(loggedInAsMarko()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.username").value("marko"))
                .andExpect(jsonPath("$.roles[0]").value("USER"));
    }

    @Test
    void withoutASessionMeIs204NotARedirect() throws Exception {
        mvc.perform(get("/api/me"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""))
                .andExpect(header().doesNotExist(HttpHeaders.LOCATION));
        assertThat(BACKEND.authorizationByPath).isEmpty();
    }

    @Test
    void missingAndExpiredSessionCookiesReturnAnonymousMe() throws Exception {
        Session expired = storedSessionWithCurrentToken("USER");
        expired.setLastAccessedTime(Instant.now().minusSeconds(3600));
        save(expired);
        for (Cookie cookie : List.of(new Cookie("SESSION", "bm90LWEtc2Vzc2lvbg=="), sessionCookie(expired))) {
            mvc.perform(get("/api/me").cookie(cookie))
                    .andExpect(status().isNoContent())
                    .andExpect(content().string(""))
                    .andExpect(header().doesNotExist(HttpHeaders.LOCATION));
        }
        assertThat(BACKEND.authorizationByPath).isEmpty();
    }

    @Test
    void realHttpSessionCheckReturnsSuccessfulUncacheableResponses() throws Exception {
        Cookie session = sessionCookie(storedSessionWithCurrentToken("USER"));
        try (var client = HttpClient.newHttpClient()) {
            URI uri = URI.create("http://localhost:" + port + "/api/me");
            var anonymous = client.send(HttpRequest.newBuilder(uri).build(), HttpResponse.BodyHandlers.ofString());
            assertThat(anonymous.statusCode()).isEqualTo(204);
            assertThat(anonymous.body()).isEmpty();
            assertThat(anonymous.headers().firstValue("location")).isEmpty();
            assertThat(anonymous.headers().firstValue("cache-control").orElse("")).contains("no-store");

            var authenticated = client.send(HttpRequest.newBuilder(uri)
                    .header("Cookie", session.getName() + "=" + session.getValue()).build(),
                    HttpResponse.BodyHandlers.ofString());
            assertThat(authenticated.statusCode()).isEqualTo(200);
            var body = tools.jackson.databind.json.JsonMapper.builder().build().readTree(authenticated.body());
            assertThat(body.get("id").asLong()).isEqualTo(42);
            assertThat(body.get("username").asString()).isEqualTo("marko");
            assertThat(authenticated.headers().firstValue("cache-control").orElse("")).contains("no-store");
        }
        assertThat(BACKEND.authorizationByPath).isEmpty();
    }

    // --- Admin concealment ---

    @Test
    void anonymousAdminPathsAre404ForEveryMethodEvenWithoutCsrf() throws Exception {
        for (String method : List.of("GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")) {
            for (String path : List.of("/api/admin", "/api/admin/", "/api/admin/users/marko/ban", "/api/admin/unknown")) {
                mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                                .request(org.springframework.http.HttpMethod.valueOf(method), path)
                                .header(HttpHeaders.AUTHORIZATION, "Bearer leaked"))
                        .andExpect(status().isNotFound());
            }
        }
        assertThat(BACKEND.authorizationByPath).isEmpty();
    }

    @Test
    void aNonAdminAccessTokenIsMaskedAndItsSessionIsKept() throws Exception {
        Session session = storedSessionWithCurrentToken("USER");
        mvc.perform(post("/api/admin/users/marko/ban").cookie(sessionCookie(session)))
                .andExpect(status().isNotFound());
        assertThat(sessions.findById(session.getId())).isNotNull();
        assertThat(BACKEND.authorizationByPath).isEmpty();
    }

    @Test
    void anAdminStillNeedsCsrfAndClientAuthorizationCannotOverrideTheCheckedToken() throws Exception {
        Session session = storedSessionWithCurrentToken("ADMIN");
        mvc.perform(post("/api/admin/users/marko/ban").cookie(sessionCookie(session)))
                .andExpect(status().isForbidden());
        assertThat(BACKEND.authorizationByPath).isEmpty();
        mvc.perform(post("/api/admin/users/marko/ban").cookie(sessionCookie(session))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer leaked").with(csrfLikeTheBrowser()))
                .andExpect(status().isOk());
        assertThat(BACKEND.authorizationOf("/api/admin/users/marko/ban")).contains("Bearer " + currentAdminToken);
    }

    @Test
    void aPromotionInTheRefreshedAccessTokenOpensTheMaskDespiteOldUserIdToken() throws Exception {
        Session session = storedSessionWithTokens("good-admin-refresh");
        mvc.perform(post("/api/admin/users/marko/ban").cookie(sessionCookie(session)).with(csrfLikeTheBrowser()))
                .andExpect(status().isOk());
        assertThat(BACKEND.authorizationOf("/api/admin/users/marko/ban")).contains("Bearer " + Backend.ADMIN_TOKEN);
    }

    @Test
    void aDemotionInTheRefreshedTokenClosesTheMaskDespiteOldAdminIdToken() throws Exception {
        Session session = storedSessionWithTokens("good-refresh");
        var admin = oidcAuthentication("ADMIN");
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                new SecurityContextImpl(admin));
        save(session);
        mvc.perform(post("/api/admin/users/marko/ban").cookie(sessionCookie(session)))
                .andExpect(status().isNotFound());
        assertThat(BACKEND.authorizationByPath).isEmpty();
    }

    @Test
    void missingExpiredAndRevokedSessionsAreConcealed() throws Exception {
        mvc.perform(get("/api/admin/users").cookie(new Cookie("SESSION", "bm90LWEtc2Vzc2lvbg==")))
                .andExpect(status().isNotFound());
        Session expired = storedSessionWithCurrentToken("ADMIN");
        expired.setLastAccessedTime(Instant.now().minusSeconds(3600));
        save(expired);
        mvc.perform(get("/api/admin/users").cookie(sessionCookie(expired))).andExpect(status().isNotFound());
        for (Session session : List.of(storedSessionWithTokens("revoked-refresh"), storedSession(null))) {
            mvc.perform(get("/api/admin/users").cookie(sessionCookie(session))).andExpect(status().isNotFound());
            assertThat(sessions.findById(session.getId())).isNull();
        }
        assertThat(BACKEND.authorizationByPath).isEmpty();
    }

    @Test
    void anAdminRefreshOutageKeepsTheSessionAndReturns503() throws Exception {
        Session session = storedSessionWithTokens("auth-error");
        mvc.perform(get("/api/admin/users").cookie(sessionCookie(session)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(header().string(HttpHeaders.RETRY_AFTER, "5"));
        assertThat(sessions.findById(session.getId())).isNotNull();
        assertThat(BACKEND.authorizationByPath).isEmpty();
    }

    @Test
    void invalidSignaturesExpiredTokensAndTokensForAnotherUserCannotOpenTheMask() throws Exception {
        for (String token : List.of(Backend.jwt("ADMIN", "another-user", PUBLIC_URL, 900),
                Backend.jwt("ADMIN", "42", "https://wrong-issuer", 900),
                Backend.jwt("ADMIN", "42", PUBLIC_URL, -120),
                Backend.jwt("ADMIN", "42", PUBLIC_URL, 900, Backend.key()), "not-a-jwt")) {
            Session session = storedSession(new OAuth2AuthorizedClient(levddit(), "42",
                    new OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, token,
                            Instant.now(), Instant.now().plusSeconds(900))));
            mvc.perform(get("/api/admin/users").cookie(sessionCookie(session))).andExpect(status().isNotFound());
        }
        assertThat(BACKEND.authorizationByPath).isEmpty();
    }

    @Test
    void realHttpMaskedAndMissingRoutesHaveTheSame404ShapeAndHeaders() throws Exception {
        // Real embedded servlet container: MockMvc does not run sendError's /error dispatch.
        try (var client = HttpClient.newHttpClient()) {
            for (String accept : List.of("application/json", "text/html")) {
                var missing = client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/missing"))
                        .header("Accept", accept).build(), HttpResponse.BodyHandlers.ofString());
                var masked = client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/admin/users"))
                        .header("Accept", accept).build(), HttpResponse.BodyHandlers.ofString());
                assertThat(masked.statusCode()).isEqualTo(404);
                assertThat(missing.statusCode()).isEqualTo(404);
                assertThat(masked.headers().firstValue("cache-control").orElse("")).contains("no-store");
                for (String header : List.of("content-type", "cache-control", "pragma", "x-content-type-options",
                        "x-frame-options", "location", "www-authenticate")) {
                    assertThat(masked.headers().allValues(header)).as(header).isEqualTo(missing.headers().allValues(header));
                }
                assertThat(masked.headers().allValues("set-cookie")).anyMatch(v -> v.startsWith("XSRF-TOKEN="));
                assertThat(missing.headers().allValues("set-cookie")).anyMatch(v -> v.startsWith("XSRF-TOKEN="));
                if (accept.equals("application/json")) {
                    var mapper = tools.jackson.databind.json.JsonMapper.builder().build();
                    var maskedBody = mapper.readTree(masked.body());
                    var missingBody = mapper.readTree(missing.body());
                    assertThat(maskedBody.get("path").asString()).isEqualTo("/api/admin/users");
                    assertThat(maskedBody.propertyNames()).isEqualTo(missingBody.propertyNames());
                    assertThat(maskedBody.get("status")).isEqualTo(missingBody.get("status"));
                    assertThat(maskedBody.get("error")).isEqualTo(missingBody.get("error"));
                } else {
                    assertThat(masked.body().replaceAll("<div id='created'>.*?</div>", ""))
                            .isEqualTo(missing.body().replaceAll("<div id='created'>.*?</div>", ""));
                }
            }
        }
    }

    // --- Calls to the services ---

    @Test
    void aLoggedInCallCarriesTheUsersAccessToken() throws Exception {
        mvc.perform(get("/api/posts").with(loggedInAsMarko())).andExpect(status().isOk());

        assertThat(BACKEND.authorizationOf("/api/posts")).contains("Bearer access-token");
    }

    @Test
    void adminRoutesForUsersGoToAuthServiceWithTheToken() throws Exception {
        mvc.perform(post("/api/admin/users/marko/ban").cookie(sessionCookie(storedSessionWithCurrentToken("ADMIN"))).with(csrfLikeTheBrowser()))
                .andExpect(status().isOk());

        assertThat(BACKEND.authorizationOf("/api/admin/users/marko/ban"))
                .contains("Bearer " + currentAdminToken);
    }

    @Test
    void anAnonymousCallGoesThroughWithoutAToken() throws Exception {
        mvc.perform(get("/api/posts")).andExpect(status().isOk());

        assertThat(BACKEND.authorizationByPath).containsKey("/api/posts");
        assertThat(BACKEND.authorizationOf("/api/posts")).isEmpty();
    }

    // --- Only the gateway's session supplies a token ---

    @Test
    void aCallersOwnTokenNeverReachesAService() throws Exception {
        mvc.perform(get("/api/posts").header(HttpHeaders.AUTHORIZATION, "Bearer leaked")).andExpect(status().isOk());

        assertThat(BACKEND.authorizationByPath).containsKey("/api/posts");
        assertThat(BACKEND.authorizationOf("/api/posts")).isEmpty();
    }

    @Test
    void aLoggedInCallersOwnHeaderIsReplacedByTheSessionsToken() throws Exception {
        mvc.perform(get("/api/communities").with(loggedInAsMarko()).header(HttpHeaders.AUTHORIZATION, "Bearer leaked"))
                .andExpect(status().isOk());

        assertThat(BACKEND.authorizationOf("/api/communities")).contains("Bearer access-token");
    }

    @Test
    void theAuthorizePageNeverReceivesABearerToken() throws Exception {
        mvc.perform(get("/oauth2/authorize").header(HttpHeaders.AUTHORIZATION, "Bearer leaked")).andExpect(status().isOk());

        assertThat(BACKEND.authorizationByPath).containsKey("/oauth2/authorize");
        assertThat(BACKEND.authorizationOf("/oauth2/authorize")).isEmpty();
    }

    @Test
    void theBrowsersCookiesReachAuthServiceButNoOtherService() throws Exception {
        Cookie login = new Cookie("JSESSIONID", "auth-login");

        mvc.perform(get("/api/posts").cookie(login)).andExpect(status().isOk());
        mvc.perform(get("/api/communities").cookie(login)).andExpect(status().isOk());
        mvc.perform(post("/api/auth/login").cookie(login)).andExpect(status().isOk());

        assertThat(BACKEND.cookieByPath.get("/api/posts")).isEmpty();
        assertThat(BACKEND.cookieByPath.get("/api/communities")).isEmpty();
        assertThat(BACKEND.cookieByPath.get("/api/auth/login")).contains("JSESSIONID=auth-login");
    }

    @Test
    void anExpiredAccessTokenIsRefreshedBeforeTheCall() throws Exception {
        Session session = storedSessionWithTokens("good-refresh");

        mvc.perform(get("/api/posts").cookie(sessionCookie(session))).andExpect(status().isOk());

        assertThat(BACKEND.authorizationOf("/api/posts")).contains("Bearer " + Backend.USER_TOKEN);
    }

    @Test
    void aRefusedRefreshEndsTheSessionWith401() throws Exception {
        Session session = storedSessionWithTokens("revoked-refresh");

        mvc.perform(get("/api/posts").cookie(sessionCookie(session)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Your session has ended, please log in again"));

        assertThat(sessions.findById(session.getId())).isNull();
        assertThat(BACKEND.authorizationByPath).doesNotContainKey("/api/posts");
        mvc.perform(get("/api/me").cookie(sessionCookie(session)))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
    }

    @Test
    void whenAuthServiceCannotBeReachedTheSessionIsKeptAnd503Returned() throws Exception {
        Session session = storedSessionWithTokens("auth-unreachable");

        mvc.perform(get("/api/posts").cookie(sessionCookie(session)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(header().string(HttpHeaders.RETRY_AFTER, "5"));

        assertThat(sessions.findById(session.getId())).as("still logged in").isNotNull();
        assertThat(BACKEND.authorizationByPath).doesNotContainKey("/api/posts");
    }

    @Test
    void whenAuthServiceAnswersWithAServerErrorTheSessionIsKeptAnd503Returned() throws Exception {
        Session session = storedSessionWithTokens("auth-error");

        mvc.perform(get("/api/posts").cookie(sessionCookie(session))).andExpect(status().isServiceUnavailable());

        assertThat(sessions.findById(session.getId())).isNotNull();
    }

    @Test
    void aLoggedInSessionWithoutTokensEndsWith401() throws Exception {
        Session session = storedSession(null);

        mvc.perform(get("/api/posts").cookie(sessionCookie(session))).andExpect(status().isUnauthorized());

        assertThat(sessions.findById(session.getId())).isNull();
    }

    // --- Cookies ---

    @Test
    void oneBrowsersAuthServiceCookieNeverReachesAnotherBrowser() throws Exception {
        // A browser without cookies: auth-service starts a login session, and its cookie goes back to that browser,
        // next to the gateway's own XSRF-TOKEN.
        mvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(header().stringValues(HttpHeaders.SET_COOKIE, hasItem(startsWith("JSESSIONID=first-browser"))));

        // Another browser without cookies must reach auth-service without the first one's session.
        mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk());

        assertThat(BACKEND.cookieByPath.get("/api/auth/csrf")).isEmpty();
    }

    // --- CSRF ---

    @Test
    void theCsrfCookieIsReadableByThePage() throws Exception {
        mvc.perform(get("/api/posts"))
                .andExpect(cookie().exists("XSRF-TOKEN"))
                .andExpect(cookie().httpOnly("XSRF-TOKEN", false));
    }

    @Test
    void aStateChangingCallNeedsTheCsrfToken() throws Exception {
        mvc.perform(post("/api/posts").with(loggedInAsMarko())).andExpect(status().isForbidden());
        mvc.perform(post("/api/posts").with(loggedInAsMarko()).with(csrfLikeTheBrowser())).andExpect(status().isOk());
    }

    @Test
    void loginAndRegisterAreLeftToAuthServicesOwnCsrfCheck() throws Exception {
        mvc.perform(post("/api/auth/login")).andExpect(status().isOk());
        mvc.perform(post("/api/auth/register")).andExpect(status().isOk());
    }

    // --- Logging out ---

    @Test
    void logoutEndsTheSessionAndPointsAtAuthServicesLogout() throws Exception {
        mvc.perform(post("/logout").with(loggedInAsMarko()).with(csrfLikeTheBrowser()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.redirectUrl").value(org.hamcrest.Matchers.allOf(
                        org.hamcrest.Matchers.startsWith(PUBLIC_URL + "/connect/logout?id_token_hint="),
                        org.hamcrest.Matchers.containsString("post_logout_redirect_uri=http://localhost:3000/"))));
    }

    @Test
    void theAuthorizeAndLogoutPagesAreRoutedToAuthService() throws Exception {
        mvc.perform(get("/oauth2/authorize")).andExpect(status().isOk());
        mvc.perform(get("/connect/logout")).andExpect(status().isOk());

        assertThat(BACKEND.authorizationByPath).containsKeys("/oauth2/authorize", "/connect/logout");
    }

    @Test
    void theTokenEndpointIsNotReachableThroughTheGateway() throws Exception {
        mvc.perform(post("/oauth2/token").with(csrfLikeTheBrowser())).andExpect(status().isNotFound());
    }

    private OidcLoginRequestPostProcessor loggedInAsMarko() {
        return oidcLogin()
                .clientRegistration(levddit())
                .idToken(token -> token.subject("42").claim("username", "marko").claim("roles", List.of("USER")));
    }

    private Session storedSessionWithCurrentToken(String role) {
        String token = Backend.jwt(role, "42", PUBLIC_URL, 900);
        if (role.equals("ADMIN")) currentAdminToken = token;
        return storedSession(new OAuth2AuthorizedClient(levddit(), "42",
                new OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, token,
                        Instant.now(), Instant.now().plusSeconds(900))));
    }

    private OAuth2AuthenticationToken markoToken() {
        return oidcAuthentication("USER");
    }

    private OAuth2AuthenticationToken oidcAuthentication(String role) {
        OidcIdToken idToken = OidcIdToken.withTokenValue("id-token").subject("42")
                .claim("username", "marko").claim("roles", List.of(role))
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(1800)).build();
        var user = new DefaultOidcUser(List.of(new SimpleGrantedAuthority("OIDC_USER")), idToken);
        return new OAuth2AuthenticationToken(user, user.getAuthorities(), OAuthClientConfig.REGISTRATION_ID);
    }

    /**
     * A logged-in session as a returning browser has it: stored in Postgres, holding marko's login and an access
     * token that expired a minute ago, with the given refresh token. The gateway's own repository writes the tokens,
     * so the attribute names are the real ones.
     */
    private Session storedSessionWithTokens(String refreshToken) {
        Instant past = Instant.now().minusSeconds(960);
        return storedSession(new OAuth2AuthorizedClient(levddit(), "42",
                new OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "old-access-token", past, past.plusSeconds(900)),
                new OAuth2RefreshToken(refreshToken, past)));
    }

    /** marko's login in a stored session, with the given tokens, or none at all. */
    private Session storedSession(OAuth2AuthorizedClient tokens) {
        Session session = sessions.createSession();
        if (tokens != null) {
            var scratch = new MockHttpServletRequest();
            authorizedClients.saveAuthorizedClient(tokens, markoToken(), scratch, new MockHttpServletResponse());
            HttpSession written = scratch.getSession();
            for (String name : Collections.list(written.getAttributeNames())) {
                session.setAttribute(name, written.getAttribute(name));
            }
        }
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                new SecurityContextImpl(markoToken()));
        save(session);
        return session;
    }

    @SuppressWarnings("unchecked")
    private void save(Session session) {
        sessions.save(session);
    }

    /** The cookie the browser would send: Spring Session's {@code SESSION}, the id Base64-encoded. */
    private static Cookie sessionCookie(Session session) {
        return new Cookie("SESSION",
                Base64.getEncoder().encodeToString(session.getId().getBytes(StandardCharsets.UTF_8)));
    }

    /** As the page does it: read the XSRF-TOKEN cookie, send it back in the X-XSRF-TOKEN header. */
    private RequestPostProcessor csrfLikeTheBrowser() throws Exception {
        Cookie xsrf = mvc.perform(get("/api/me")).andReturn().getResponse().getCookie("XSRF-TOKEN");
        assertThat(xsrf).isNotNull();
        return request -> {
            List<Cookie> cookies = new ArrayList<>(request.getCookies() == null ? List.of() : List.of(request.getCookies()));
            cookies.add(xsrf);
            request.setCookies(cookies.toArray(Cookie[]::new));
            request.addHeader("X-XSRF-TOKEN", xsrf.getValue());
            return request;
        };
    }

    private ClientRegistration levddit() {
        return registrations.findByRegistrationId(OAuthClientConfig.REGISTRATION_ID);
    }

    /**
     * Stands in for auth-service and the services: records each path's Authorization header and answers 200,
     * except the token endpoint. It refreshes {@code good-refresh}, drops the connection for
     * {@code auth-unreachable} (a restart or network failure), answers 500 for {@code auth-error}, and refuses
     * anything else with {@code invalid_grant}. It also sets a login cookie on {@code /api/auth/csrf}, as
     * auth-service does.
     */
    private record Backend(HttpServer server, Map<String, String> authorizationByPath,
                           Map<String, String> cookieByPath) {
        private static final RSAKey KEY = key();
        private static final String ADMIN_TOKEN = jwt("ADMIN", "42", PUBLIC_URL, 900);
        private static final String USER_TOKEN = jwt("USER", "42", PUBLIC_URL, 900);

        private static RSAKey key() {
            try {
                return new RSAKeyGenerator(2048).keyID("test-signing-key").generate();
            } catch (JOSEException e) {
                throw new IllegalStateException(e);
            }
        }

        static String jwt(String role, String subject, String issuer, int lifetime) {
            return jwt(role, subject, issuer, lifetime, KEY);
        }

        static String jwt(String role, String subject, String issuer, int lifetime, RSAKey signingKey) {
            try {
                var claims = new JWTClaimsSet.Builder().issuer(issuer).subject(subject)
                        .issueTime(Date.from(Instant.now().minusSeconds(180)))
                        .expirationTime(Date.from(Instant.now().plusSeconds(lifetime)))
                        .claim("roles", List.of(role)).build();
                var jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(KEY.getKeyID()).build(), claims);
                jwt.sign(new RSASSASigner(signingKey));
                return jwt.serialize();
            } catch (JOSEException e) {
                throw new IllegalStateException(e);
            }
        }

        static Backend start() {
            try {
                HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
                Backend backend = new Backend(server, new ConcurrentHashMap<>(), new ConcurrentHashMap<>());
                server.createContext("/", backend::handle);
                server.start();
                return backend;
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        }

        String url() {
            return "http://localhost:" + server.getAddress().getPort();
        }

        Optional<String> authorizationOf(String path) {
            return Optional.ofNullable(authorizationByPath.get(path)).filter(value -> !value.isEmpty());
        }

        private void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            if (path.equals("/oauth2/jwks")) {
                respond(exchange, 200, new JWKSet(KEY.toPublicJWK()).toString());
                return;
            }
            if (path.equals("/oauth2/token")) {
                String form = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                if (form.contains("refresh_token=auth-unreachable")) {
                    exchange.close(); // no answer at all
                    return;
                }
                if (form.contains("refresh_token=auth-error")) {
                    respond(exchange, 500, "{}");
                    return;
                }
                if (form.contains("refresh_token=good-refresh") || form.contains("refresh_token=good-admin-refresh")) {
                    respond(exchange, 200, """
                            {"access_token":"%s","token_type":"Bearer","expires_in":900,
                             "refresh_token":"rotated-refresh"}""".formatted(
                                     form.contains("good-admin-refresh") ? ADMIN_TOKEN : USER_TOKEN));
                } else {
                    respond(exchange, 400, "{\"error\":\"invalid_grant\"}");
                }
                return;
            }
            String authorization = exchange.getRequestHeaders().getFirst(HttpHeaders.AUTHORIZATION);
            authorizationByPath.put(path, authorization == null ? "" : authorization);
            String cookie = exchange.getRequestHeaders().getFirst(HttpHeaders.COOKIE);
            cookieByPath.put(path, cookie == null ? "" : cookie);
            if (path.equals("/api/auth/csrf")) {
                exchange.getResponseHeaders().add(HttpHeaders.SET_COOKIE, "JSESSIONID=first-browser; Path=/; HttpOnly");
            }
            respond(exchange, 200, "{}");
        }

        private static void respond(HttpExchange exchange, int status, String body) throws IOException {
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, bytes.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(bytes);
            }
        }
    }
}

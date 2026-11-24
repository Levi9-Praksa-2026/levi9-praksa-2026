package com.levi9.reddit.gateway.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.ClientAuthorizationException;
import org.springframework.security.oauth2.client.OAuth2AuthorizeRequest;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientManager;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/** Runs after session restoration, before CSRF and routing. It never trusts login-time ID-token roles. */
public final class AdminMaskingFilter extends OncePerRequestFilter {
    public static final String CHECKED_TOKEN = AdminMaskingFilter.class.getName() + ".checkedToken";
    private static final Logger log = LoggerFactory.getLogger(AdminMaskingFilter.class);
    private static final RequestMatcher ADMIN = PathPatternRequestMatcher.withDefaults().matcher("/api/admin/**");
    private final OAuth2AuthorizedClientManager clients;
    private final JwtDecoder decoder;
    private final CsrfTokenRepository csrfTokens;

    AdminMaskingFilter(OAuth2AuthorizedClientManager clients, JwtDecoder decoder, CsrfTokenRepository csrfTokens) {
        this.clients = clients;
        this.decoder = decoder;
        this.csrfTokens = csrfTokens;
    }

    static boolean isAdminPath(HttpServletRequest request) {
        return ADMIN.matches(request);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !isAdminPath(request);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof OAuth2AuthenticationToken oauth) || !oauth.isAuthenticated()) {
            notFound(request, response);
            return;
        }
        String token;
        try {
            var client = clients.authorize(OAuth2AuthorizeRequest
                    .withClientRegistrationId(oauth.getAuthorizedClientRegistrationId())
                    .principal(oauth)
                    .attribute(HttpServletRequest.class.getName(), request)
                    .attribute(HttpServletResponse.class.getName(), response)
                    .build());
            if (client == null) {
                notFound(request, response);
                return;
            }
            token = client.getAccessToken().getTokenValue();
            var jwt = decoder.decode(token);
            // Only the access token of this session's user may open the mask.
            Object roles = jwt.getClaims().get("roles");
            if (!oauth.getName().equals(jwt.getSubject()) || !(roles instanceof List<?> values)
                    || !values.contains("ADMIN")) {
                log.debug("Concealed admin request: insufficient access-token permissions");
                notFound(request, response);
                return;
            }
        } catch (ClientAuthorizationException failure) {
            // This filter runs before the outer routing failure handler can catch refresh failures.
            csrfTokens.loadDeferredToken(request, response).get();
            RefreshFailedFilter.respondToFailure(request, response, failure);
            return;
        } catch (BadJwtException failure) {
            log.debug("Concealed admin request: invalid access token");
            notFound(request, response);
            return;
        } catch (JwtException failure) {
            // A key-fetch outage is operational, not evidence that a valid session lost permissions.
            log.warn("Could not validate an admin access token", failure);
            response.setHeader("Retry-After", "5");
            response.sendError(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            return;
        }
        request.setAttribute(CHECKED_TOKEN, token);
        chain.doFilter(request, response);
    }

    private void notFound(HttpServletRequest request, HttpServletResponse response) throws IOException {
        // Ordinary gateway requests load the SPA CSRF cookie too. Keep cookie behavior consistent,
        // without creating an HttpSession for a probe. Boot's normal error dispatch retains the original URI.
        csrfTokens.loadDeferredToken(request, response).get();
        response.sendError(HttpServletResponse.SC_NOT_FOUND);
    }
}

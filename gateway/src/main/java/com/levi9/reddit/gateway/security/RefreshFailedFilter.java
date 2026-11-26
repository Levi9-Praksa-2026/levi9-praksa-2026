package com.levi9.reddit.gateway.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.client.ClientAuthorizationException;
import org.springframework.security.oauth2.core.OAuth2ErrorCodes;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * Answers when {@code TokenRelay} could not get a valid access token before a call, instead of letting it surface
 * as a 500. Spring reports two very different situations with the same exception, so the error code decides:
 * <ul>
 *   <li><b>auth-service refused</b> ({@code invalid_grant}: the account was deleted or banned, the password changed,
 *   or the authorization was revoked), or the session has no tokens at all ({@code client_authorization_required}):
 *   the login is over. The session ends and the answer is 401, so the page sends the user to log in.</li>
 *   <li><b>auth-service could not be asked</b> (down for a restart or deploy, a network error, a 5xx: Spring calls all
 *   of these {@code invalid_token_response}): the login is still valid, and Spring keeps the tokens. The session is
 *   kept too, and the answer is 503 with {@code Retry-After}, so the page can try again in a moment.</li>
 * </ul>
 */
@Component
class RefreshFailedFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(RefreshFailedFilter.class);
    /** Codes that mean "this login can no longer get tokens", as opposed to "auth-service did not answer". */
    private static final Set<String> LOGIN_OVER = Set.of(OAuth2ErrorCodes.INVALID_GRANT, "client_authorization_required");
    private static final int RETRY_AFTER_SECONDS = 5;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        try {
            chain.doFilter(request, response);
        } catch (ServletException | RuntimeException e) {
            ClientAuthorizationException failure = clientAuthorizationFailure(e);
            if (failure == null || response.isCommitted()) {
                throw e;
            }
            respondToFailure(request, response, failure);
        }
    }

    static void respondToFailure(HttpServletRequest request, HttpServletResponse response,
                                 ClientAuthorizationException failure) throws IOException {
        response.resetBuffer();
        if (LOGIN_OVER.contains(failure.getError().getErrorCode())) {
            HttpSession session = request.getSession(false);
            if (session != null) {
                session.invalidate();
            }
            if (AdminMaskingFilter.isAdminPath(request)) {
                response.sendError(HttpServletResponse.SC_NOT_FOUND);
            } else {
                writeProblem(response, HttpStatus.UNAUTHORIZED, "Your session has ended, please log in again");
            }
        } else {
            log.warn("Could not refresh an access token ({}), keeping the session: {}",
                    failure.getError().getErrorCode(), failure.getError().getDescription());
            response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(RETRY_AFTER_SECONDS));
            writeProblem(response, HttpStatus.SERVICE_UNAVAILABLE,
                    "Signing in is briefly unavailable, please try again in a moment");
        }
    }

    private static void writeProblem(HttpServletResponse response, HttpStatus status, String detail) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.getWriter().write("{\"type\":\"about:blank\",\"title\":\"" + status.getReasonPhrase()
                + "\",\"status\":" + status.value() + ",\"detail\":\"" + detail + "\"}");
    }

    private static ClientAuthorizationException clientAuthorizationFailure(Throwable e) {
        for (Throwable cause = e; cause != null; cause = cause.getCause()) {
            if (cause instanceof ClientAuthorizationException failure) {
                return failure;
            }
        }
        return null;
    }
}

package com.levi9.reddit.auth.core.service;

import com.levi9.reddit.auth.contracts.AuthResponse;
import com.levi9.reddit.auth.contracts.LoginRequest;
import com.levi9.reddit.auth.contracts.RefreshRequest;
import com.levi9.reddit.auth.contracts.RegisterRequest;
import com.levi9.reddit.auth.core.exception.ConflictException;
import com.levi9.reddit.auth.core.exception.ErrorType;
import com.levi9.reddit.auth.core.exception.UnauthorizedException;
import com.levi9.reddit.auth.core.exception.UserBannedException;
import com.levi9.reddit.auth.core.model.RefreshToken;
import com.levi9.reddit.auth.core.model.User;
import com.levi9.reddit.auth.infrastructure.repository.RefreshTokenRepository;
import com.levi9.reddit.auth.infrastructure.repository.UserRepository;
import com.levi9.reddit.auth.infrastructure.security.IssuedTokens;
import com.levi9.reddit.auth.infrastructure.security.JwtProperties;
import com.levi9.reddit.auth.infrastructure.security.TokenService;
import org.hibernate.exception.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

/**
 * Register, login and refresh. Rules: workspace DECISIONS.md (2026-11-18). Errors never reveal whether an
 * email is registered; a taken username may be named, because usernames are public.
 */
@Service
public class AuthService {
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    // Unique indexes from V1__create_auth_schema.sql. They catch the race the checks below can't.
    private static final String USERNAME_INDEX = "ux_users_username_lower";
    private static final String EMAIL_INDEX = "ux_users_email_lower";
    /** BCrypt only uses 72 bytes; register never accepts more, so a longer login password can't be right. */
    private static final int MAX_PASSWORD_BYTES = 72;
    /** A token rotated this recently was most likely spent by another tab of the same user, not stolen. */
    static final Duration REFRESH_GRACE_PERIOD = Duration.ofSeconds(10);

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwords;
    private final TokenService tokens;
    private final JwtProperties jwtProperties;
    private final RefreshTokenRevoker revoker;
    private final Clock clock;
    /** Checked against when the email is unknown, so that case costs the same BCrypt time as a real check. */
    private final String dummyPasswordHash;

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens, PasswordEncoder passwords,
                       TokenService tokens, JwtProperties jwtProperties, RefreshTokenRevoker revoker, Clock clock) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.passwords = passwords;
        this.tokens = tokens;
        this.jwtProperties = jwtProperties;
        this.revoker = revoker;
        this.clock = clock;
        this.dummyPasswordHash = passwords.encode("timing-equaliser-not-a-real-password");
    }

    /**
     * Creates a USER account and logs it in. The username is checked first, so when both are taken the
     * answer is the harmless {@code USERNAME_TAKEN}. The cheap checks run before BCrypt, so a rejected
     * request costs no hashing.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (users.existsByUsernameIgnoringCase(request.username())) {
            throw usernameTaken();
        }
        if (users.existsByEmailIgnoringCase(request.email())) {
            throw registrationFailed();
        }

        User user = new User(request.username(), request.email(), passwords.encode(request.password()),
                request.firstName(), request.lastName());
        try {
            // Flush now so a duplicate from a simultaneous registration fails here, where we can name it.
            users.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            String index = violatedConstraint(e);
            if (USERNAME_INDEX.equals(index)) {
                throw usernameTaken();
            }
            if (EMAIL_INDEX.equals(index)) {
                throw registrationFailed();
            }
            throw e; // any other constraint is a bug, not a client error
        }
        return issueTokens(user);
    }

    /**
     * Logs in by email and password. Unknown email, wrong password and deleted account all get the same
     * {@code 401}, in about the same time, so the response never tells whether an email is registered.
     * A banned user gets {@code 403} with the reason, but only after the password is proven correct.
     */
    @Transactional
    public AuthResponse login(LoginRequest request) {
        Optional<User> found = users.findByEmailIgnoringCase(request.email());
        String hashToCheck = found.map(User::getPasswordHash).orElse(dummyPasswordHash);
        boolean passwordMatches = passwordMatches(request.password(), hashToCheck);

        if (found.isEmpty() || !passwordMatches || found.get().isDeleted()) {
            throw new UnauthorizedException(ErrorType.INVALID_CREDENTIALS, "Invalid email or password");
        }
        User user = found.get();
        if (user.isBanned()) {
            throw new UserBannedException(user.getBanReason());
        }
        return issueTokens(user);
    }

    /**
     * Swaps a refresh token for a new pair (rotation). The old token works exactly once: the conditional revoke
     * lets only one of several simultaneous requests win, and the winner gets a fresh 7 days (sliding expiry).
     * A token that was already used is answered by how long ago:
     * <ul>
     *   <li>within {@link #REFRESH_GRACE_PERIOD}: {@code 409}, another tab just refreshed; nothing is revoked;</li>
     *   <li>later: treated as stolen, every refresh token of the user is revoked, and the answer is {@code 401}.</li>
     * </ul>
     * Unknown and expired tokens get {@code 401}; a banned user gets {@code 403}; a deleted user {@code 401}.
     * <p>
     * Known limitation: a token records only when it was revoked, not why. A token killed by a revoke-all
     * (and later by logout or ban) therefore also answers {@code 409} for its first 10 seconds, then {@code 401}.
     * It never yields new tokens. Accepted because refresh moves to Spring Authorization Server later.
     */
    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        String tokenHash = tokens.hash(request.refreshToken());
        Instant now = clock.instant();

        if (refreshTokens.revokeIfActive(tokenHash, now) == 1) {
            RefreshToken spent = refreshTokens.findByTokenHash(tokenHash).orElseThrow();
            User user = users.findById(spent.getUserId()).orElseThrow();
            if (user.isDeleted()) {
                throw invalidRefreshToken();
            }
            if (user.isBanned()) {
                throw new UserBannedException(user.getBanReason());
            }
            return issueTokens(user);
        }

        // Not active. Read it again: the revoke above waited for any simultaneous request to commit first.
        RefreshToken token = refreshTokens.findByTokenHash(tokenHash).orElseThrow(AuthService::invalidRefreshToken);
        if (!token.getExpiresAt().isAfter(now)) {
            throw invalidRefreshToken(); // expired: unusable anyway, not a sign of theft
        }
        if (token.getRevokedAt().isAfter(now.minus(REFRESH_GRACE_PERIOD))) {
            throw new ConflictException(ErrorType.REFRESH_IN_PROGRESS,
                    "This refresh token was just used by another request");
        }
        int revoked = revoker.revokeAllOf(token.getUserId(), now);
        log.warn("Refresh token reuse for user {}: revoked all {} active refresh tokens", token.getUserId(), revoked);
        throw invalidRefreshToken();
    }

    private AuthResponse issueTokens(User user) {
        IssuedTokens issued = tokens.issue(user);
        refreshTokens.save(new RefreshToken(user.getId(), issued.refreshTokenHash(), issued.refreshTokenExpiresAt()));
        return new AuthResponse(issued.accessToken(), issued.refreshToken(), jwtProperties.accessTokenTtl().toSeconds());
    }

    /**
     * BCrypt's {@code matches} silently cuts input at 72 bytes, so a longer password whose first 72 bytes are
     * right would pass. No registered password is longer, so anything over the limit is simply wrong.
     * BCrypt still runs, to keep the timing the same.
     */
    private boolean passwordMatches(String rawPassword, String hash) {
        if (rawPassword.getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES) {
            passwords.matches("", hash);
            return false;
        }
        return passwords.matches(rawPassword, hash);
    }

    private static UnauthorizedException invalidRefreshToken() {
        return new UnauthorizedException(ErrorType.INVALID_REFRESH_TOKEN, "Refresh token is invalid or expired");
    }

    private static ConflictException usernameTaken() {
        return new ConflictException(ErrorType.USERNAME_TAKEN, "Username is already taken");
    }

    private static ConflictException registrationFailed() {
        return new ConflictException(ErrorType.REGISTRATION_FAILED, "Registration failed, please check your details");
    }

    private static String violatedConstraint(DataIntegrityViolationException e) {
        for (Throwable cause = e; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException violation) {
                return violation.getConstraintName();
            }
        }
        return null;
    }
}

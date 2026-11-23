package com.levi9.reddit.auth.api;

import com.levi9.reddit.auth.contracts.BanUserRequest;
import com.levi9.reddit.auth.core.service.UserBanService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin-only ban and unban. Under {@code /api/admin/**}, the team's prefix for every admin route, so it is on the
 * resource server chain ({@link UserApiSecurityConfig}) and its admin-only URL rule: a bearer token from the gateway,
 * {@code roles} as {@code ROLE_*}, and the admin's user id from {@code sub}. {@code @PreAuthorize} checks the role a
 * second time, in case the URL rule is ever changed.
 */
@RestController
@RequestMapping("/api/admin/users/{username}/ban")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {
    private final UserBanService bans;

    public AdminUserController(UserBanService bans) {
        this.bans = bans;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void ban(@PathVariable String username,
                    @Valid @RequestBody BanUserRequest request,
                    @AuthenticationPrincipal Jwt jwt) {
        bans.ban(username, Long.valueOf(jwt.getSubject()), request.reason());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unban(@PathVariable String username) {
        bans.unban(username);
    }
}

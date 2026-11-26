package com.levi9.reddit.auth.controller;

import com.levi9.reddit.auth.dto.BanUserDTO;
import com.levi9.reddit.auth.dto.RegisterDTO;
import com.levi9.reddit.auth.dto.UserProfileDTO;
import com.levi9.reddit.auth.service.AuthService;
import com.levi9.reddit.auth.dto.AdminUserDTO;
import com.levi9.reddit.auth.dto.PageDTO;
import com.levi9.reddit.auth.service.UserDirectoryService;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import com.levi9.reddit.auth.service.UserBanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
 * Admin-only user directory, ban and unban. Under {@code /api/admin/**}, the team's prefix for every admin route, so it is on the
 * resource server chain ({@code UserApiSecurityConfig}) and its admin-only URL rule: a bearer token from the gateway,
 * {@code roles} as {@code ROLE_*}, and the admin's user id from {@code sub}. {@code @PreAuthorize} checks the role a
 * second time, in case the URL rule is ever changed.
 */
@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminUserController {
    private final UserBanService bans;
    private final UserDirectoryService directory;
    private final AuthService accounts;

    /** Creates a regular USER account without changing the administrator's session. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserProfileDTO create(@Valid @RequestBody RegisterDTO request) {
        var user = accounts.register(request);
        return new UserProfileDTO(user.getId(), user.getUsername(), user.getEmail(), user.getFirstName(), user.getLastName());
    }

    @GetMapping
    public PageDTO<AdminUserDTO> list(
            @RequestParam(required = false) @Size(max = 254) String q,
            @RequestParam(required = false) @Pattern(regexp = "active|banned|deleted") String status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return directory.list(q, status, page, size);
    }

    @PostMapping("/{username}/ban")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void ban(@PathVariable String username,
                    @Valid @RequestBody BanUserDTO request,
                    @AuthenticationPrincipal Jwt jwt) {
        bans.ban(username, Long.valueOf(jwt.getSubject()), request.reason());
    }

    @DeleteMapping("/{username}/ban")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unban(@PathVariable String username) {
        bans.unban(username);
    }
}

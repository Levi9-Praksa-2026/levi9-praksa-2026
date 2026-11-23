package com.levi9.reddit.auth.controller;

import com.levi9.reddit.auth.dto.ChangePasswordDTO;
import com.levi9.reddit.auth.dto.DeleteUserDTO;
import com.levi9.reddit.auth.dto.UpdateUserDTO;
import com.levi9.reddit.auth.dto.UserProfileDTO;
import com.levi9.reddit.auth.exception.ErrorType;
import com.levi9.reddit.auth.exception.UnauthorizedException;
import com.levi9.reddit.auth.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public UserProfileDTO getMe(@AuthenticationPrincipal Jwt jwt) {
        return userService.getProfile(authenticatedUserId(jwt));
    }

    @PatchMapping("/me")
    public UserProfileDTO updateMe(@AuthenticationPrincipal Jwt jwt,
                                   @Valid @RequestBody UpdateUserDTO request) {
        return userService.updateProfile(authenticatedUserId(jwt), request);
    }

    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMe(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody DeleteUserDTO request) {
        userService.delete(authenticatedUserId(jwt), request.password());
    }

    @PutMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changeMyPassword(@AuthenticationPrincipal Jwt jwt,
                                 @Valid @RequestBody ChangePasswordDTO request) {
        userService.changePassword(authenticatedUserId(jwt), request.currentPassword(), request.newPassword(),
                jwt.getTokenValue());
    }

    private static long authenticatedUserId(Jwt jwt) {
        if (jwt != null) {
            try {
                long userId = Long.parseLong(jwt.getSubject());
                if (userId > 0) {
                    return userId;
                }
            } catch (NumberFormatException ignored) {
                // A subject that cannot identify a user is invalid.
            }
        }
        throw new UnauthorizedException(ErrorType.INVALID_CREDENTIALS, "Invalid user identity");
    }
}

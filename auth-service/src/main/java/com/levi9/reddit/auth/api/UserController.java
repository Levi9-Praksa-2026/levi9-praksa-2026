package com.levi9.reddit.auth.api;

import com.levi9.reddit.auth.core.service.UserService;
import com.levi9.reddit.auth.contracts.DeleteUserRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {
    // Temporary until the authenticated user's identity is available.
    private static final long CURRENT_USER_ID = 1L;
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMe(@Valid @RequestBody DeleteUserRequest request) {
        userService.delete(CURRENT_USER_ID, request.password());
    }

}

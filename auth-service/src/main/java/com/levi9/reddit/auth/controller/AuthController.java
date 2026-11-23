package com.levi9.reddit.auth.controller;

import com.levi9.reddit.auth.dto.RegisterDTO;
import com.levi9.reddit.auth.dto.UserProfileDTO;
import com.levi9.reddit.auth.entity.User;
import com.levi9.reddit.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

/** Registration. Public (see {@code SecurityConfig}). Login is Spring Security's form login, not a controller. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    /** {@code 201} with the new user and {@code Location} pointing at their public profile. No tokens. */
    @PostMapping("/register")
    public ResponseEntity<UserProfileDTO> register(@Valid @RequestBody RegisterDTO request) {
        User user = auth.register(request);
        // Relative on purpose: behind the gateway, this service's own host name is not what the client sees.
        URI profile = UriComponentsBuilder.fromPath("/api/users/{username}")
                .buildAndExpand(user.getUsername()).encode().toUri();
        return ResponseEntity.created(profile).body(new UserProfileDTO(user.getId(), user.getUsername(),
                user.getEmail(), user.getFirstName(), user.getLastName()));
    }
}

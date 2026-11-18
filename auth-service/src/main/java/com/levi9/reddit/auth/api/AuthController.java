package com.levi9.reddit.auth.api;

import com.levi9.reddit.auth.contracts.AuthResponse;
import com.levi9.reddit.auth.contracts.LoginRequest;
import com.levi9.reddit.auth.contracts.RefreshRequest;
import com.levi9.reddit.auth.contracts.RegisterRequest;
import com.levi9.reddit.auth.core.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

/**
 * Register, login and refresh. Public routes (see {@link SecurityConfig}): they are how a client gets a token.
 * All rules live in {@link AuthService}; errors become problem details in {@link GlobalExceptionHandler}.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    /** {@code 201}, with {@code Location} pointing at the new user's public profile and the tokens in the body. */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse tokens = auth.register(request);
        // Relative on purpose: behind the gateway, this service's own host name is not what the client sees.
        URI profile = UriComponentsBuilder.fromPath("/api/users/{username}")
                .buildAndExpand(request.username()).encode().toUri();
        return ResponseEntity.created(profile).body(tokens);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return auth.login(request);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return auth.refresh(request);
    }
}

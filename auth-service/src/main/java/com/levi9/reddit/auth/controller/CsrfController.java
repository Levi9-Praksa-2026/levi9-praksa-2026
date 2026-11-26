package com.levi9.reddit.auth.controller;

import com.levi9.reddit.auth.dto.CsrfDTO;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The CSRF token the login and register pages send back in a header. It lives in auth-service's session, not in a
 * cookie: the gateway already uses the {@code XSRF-TOKEN} cookie for its own check, and the two would overwrite
 * each other.
 */
@RestController
class CsrfController {

    @GetMapping("/api/auth/csrf")
    CsrfDTO csrf(CsrfToken token) {
        return new CsrfDTO(token.getHeaderName(), token.getToken());
    }
}

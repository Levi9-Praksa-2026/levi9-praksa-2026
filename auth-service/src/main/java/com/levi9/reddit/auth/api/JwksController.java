package com.levi9.reddit.auth.api;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Publishes the public signing key so other services can verify access tokens.
 * Called service-to-service; the gateway only routes /api/**, so this is not exposed to browsers.
 */
@RestController
class JwksController {
    private final Map<String, Object> jwks;

    JwksController(RSAKey jwtSigningKey) {
        // toPublicJWK() strips the private parts. Publishing jwtSigningKey itself would leak the private key.
        this.jwks = new JWKSet(jwtSigningKey.toPublicJWK()).toJSONObject();
    }

    @GetMapping("/.well-known/jwks.json")
    Map<String, Object> jwks() {
        return jwks;
    }
}

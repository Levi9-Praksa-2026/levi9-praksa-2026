package com.levi9.reddit.auth.security;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

/**
 * JWT settings, bound from {@code app.jwt.*} and validated at startup.
 * The private key comes from the environment ({@code APP_JWT_PRIVATE_KEY}) and is never committed.
 */
@Validated
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
        @NotBlank String issuer,
        @NotNull Duration accessTokenTtl,
        @NotNull Duration refreshTokenTtl,
        String keyId,
        String privateKey,
        boolean generateKey) {
}

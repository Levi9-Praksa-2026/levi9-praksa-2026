package com.levi9.reddit.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** The dev profile's admin account, bound from {@code app.dev-admin.*}. Checked against the registration rules. */
@ConfigurationProperties(prefix = "app.dev-admin")
public record DevAdminProperties(String username, String email, String password) {
}

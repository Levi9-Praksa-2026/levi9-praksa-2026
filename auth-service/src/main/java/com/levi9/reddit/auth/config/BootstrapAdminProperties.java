package com.levi9.reddit.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * The first ADMIN account in production, bound from {@code app.bootstrap-admin.*}. On AWS these come from the
 * {@code levddit/bootstrap-admin} secret; locally they are unset. Checked against the registration rules.
 */
@ConfigurationProperties(prefix = "app.bootstrap-admin")
public record BootstrapAdminProperties(String username, String email, String password) {
}

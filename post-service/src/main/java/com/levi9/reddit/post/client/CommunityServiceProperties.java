package com.levi9.reddit.post.client;

import java.net.URI;
import java.time.Duration;
import java.util.Objects;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Where community-service is and how long to wait for it.
 *
 * @param url            internal base address, e.g. {@code http://community-service:8082}; required
 * @param connectTimeout how long to wait for a connection (default 1 s)
 * @param readTimeout    how long to wait for an answer once connected (default 2 s)
 */
@ConfigurationProperties(prefix = "app.community-service")
public record CommunityServiceProperties(URI url, Duration connectTimeout, Duration readTimeout) {

    public CommunityServiceProperties {
        Objects.requireNonNull(url, "app.community-service.url is required (COMMUNITY_SERVICE_URL)");
        connectTimeout = connectTimeout == null ? Duration.ofSeconds(1) : connectTimeout;
        readTimeout = readTimeout == null ? Duration.ofSeconds(2) : readTimeout;
    }
}

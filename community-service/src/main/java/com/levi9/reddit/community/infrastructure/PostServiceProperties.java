package com.levi9.reddit.community.infrastructure;

import java.net.URI;
import java.time.Duration;
import java.util.Objects;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.post-service")
public record PostServiceProperties(URI baseUrl, Duration connectTimeout, Duration readTimeout) {

    public PostServiceProperties {
        Objects.requireNonNull(baseUrl, "baseUrl");
        connectTimeout = Objects.requireNonNullElse(connectTimeout, Duration.ofSeconds(2));
        readTimeout = Objects.requireNonNullElse(readTimeout, Duration.ofSeconds(5));
    }
}

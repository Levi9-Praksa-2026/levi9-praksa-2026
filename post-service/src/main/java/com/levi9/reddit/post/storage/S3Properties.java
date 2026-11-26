package com.levi9.reddit.post.storage;

import java.net.URI;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.s3")
public record S3Properties(String bucket, String region, URI endpoint) {
}

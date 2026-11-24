package com.levi9.reddit.post.client;

import com.levi9.reddit.post.exception.CommunityServiceUnavailableException;
import java.util.Objects;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Asks community-service over its {@code /internal} endpoints. Both answer 2xx for yes and 404 for no; a missing or
 * inactive community is a 404 on both, which is why {@link #isActive} is asked first.
 *
 * <p>Anything else (connection refused, timeout, a 5xx or an unexpected status) means the question could not be
 * answered, and becomes {@link CommunityServiceUnavailableException} (503). It is never read as "no": that would tell
 * the user their community is gone or they are not a member, and never as "yes": that would let anyone post anywhere.
 */
public final class HttpCommunityDirectory implements CommunityDirectory {
    private final RestClient http;

    /** @param http already pointed at community-service ({@code baseUrl}) and with timeouts set */
    public HttpCommunityDirectory(RestClient http) {
        this.http = Objects.requireNonNull(http, "http");
    }

    /** {@code GET /internal/communities/{id}}: 200 with name and status if active, 404 if missing or inactive. */
    @Override
    public boolean isActive(long communityId) {
        return exists(http.get().uri("/internal/communities/{id}", communityId));
    }

    /** {@code GET /internal/communities/{id}/members/{userId}}: 204 if joined, 404 if not. */
    @Override
    public boolean isMember(long communityId, long userId) {
        return exists(http.get().uri("/internal/communities/{id}/members/{userId}", communityId, userId));
    }

    private static boolean exists(RestClient.RequestHeadersSpec<?> request) {
        try {
            request.retrieve().toBodilessEntity(); // any 2xx; 4xx and 5xx throw
            return true;
        } catch (HttpClientErrorException.NotFound e) {
            return false;
        } catch (RestClientException e) {
            throw new CommunityServiceUnavailableException(e);
        }
    }
}

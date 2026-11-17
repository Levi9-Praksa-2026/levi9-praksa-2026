package com.levi9.reddit.community.infrastructure;

import com.levi9.reddit.community.contracts.PageResponse;
import com.levi9.reddit.community.contracts.PostResponse;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;


@Component
public class PostServiceClient {
    // post-service caps "size" at 100; walking its pages keeps the response complete for large communities.
    private static final int PAGE_SIZE = 100;
    private static final ParameterizedTypeReference<PageResponse<PostResponse>> POST_PAGE =
            new ParameterizedTypeReference<>() {};

    private final RestClient restClient;

    public PostServiceClient(@Qualifier("postServiceRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    /** All visible posts of a community, newest first, as ordered by post-service. */
    public List<PostResponse> findPostsByCommunity(Long communityId) {
        List<PostResponse> posts = new ArrayList<>();
        int page = 0;
        int totalPages;
        do {
            PageResponse<PostResponse> response = fetchPage(communityId, page);
            posts.addAll(response.content());
            totalPages = response.totalPages();
            page++;
        } while (page < totalPages);
        return List.copyOf(posts);
    }

    private PageResponse<PostResponse> fetchPage(Long communityId, int page) {
        try {
            PageResponse<PostResponse> response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/posts")
                            .queryParam("communityId", communityId)
                            .queryParam("page", page)
                            .queryParam("size", PAGE_SIZE)
                            .build())
                    .retrieve()
                    .body(POST_PAGE);
            if (response == null) {
                throw new PostServiceUnavailableException("post-service returned an empty response", null);
            }
            return response;
        } catch (RestClientException e) {
            throw new PostServiceUnavailableException(
                    "Failed to load posts of community " + communityId, e);
        }
    }
}

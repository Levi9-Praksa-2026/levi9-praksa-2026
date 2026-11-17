package com.levi9.reddit.community.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.levi9.reddit.community.contracts.PostResponse;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class PostServiceClientTest {

    private static final String FIRST_PAGE = """
            {
              "content": [
                {"id": 11, "title": "Hello", "content": "Body", "authorId": 2, "authorUsername": "luka",
                 "communityId": 7, "score": 3, "commentCount": 0,
                 "createdAt": "2026-11-01T10:00:00Z", "updatedAt": null}
              ],
              "page": 0, "size": 100, "totalElements": 2, "totalPages": 2
            }
            """;

    private static final String SECOND_PAGE = """
            {
              "content": [
                {"id": 10, "title": "Older", "content": null, "authorId": 3, "authorUsername": "ana",
                 "communityId": 7, "score": 1, "commentCount": 2,
                 "createdAt": "2026-10-01T10:00:00Z", "updatedAt": "2026-10-02T10:00:00Z"}
              ],
              "page": 1, "size": 100, "totalElements": 2, "totalPages": 2
            }
            """;

    private final RestClient.Builder builder = RestClient.builder().baseUrl("http://post-service");
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final PostServiceClient client = new PostServiceClient(builder.build());

    @Test
    void findPostsByCommunity_walksEveryPageAndCombinesThem() {
        server.expect(requestTo("http://post-service/api/posts?communityId=7&page=0&size=100"))
                .andRespond(withSuccess(FIRST_PAGE, MediaType.APPLICATION_JSON));
        server.expect(requestTo("http://post-service/api/posts?communityId=7&page=1&size=100"))
                .andRespond(withSuccess(SECOND_PAGE, MediaType.APPLICATION_JSON));

        List<PostResponse> result = client.findPostsByCommunity(7L);

        assertThat(result).extracting(PostResponse::id).containsExactly(11L, 10L);
        assertThat(result).extracting(PostResponse::title).containsExactly("Hello", "Older");
        server.verify();
    }

    @Test
    void findPostsByCommunity_whenPostServiceFails_throwsUnavailable() {
        server.expect(requestTo("http://post-service/api/posts?communityId=7&page=0&size=100"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThatThrownBy(() -> client.findPostsByCommunity(7L))
                .isInstanceOf(PostServiceUnavailableException.class)
                .hasMessageContaining("community 7");
    }

    @Test
    void findPostsByCommunity_whenResponseHasNoBody_throwsUnavailable() {
        server.expect(requestTo("http://post-service/api/posts?communityId=7&page=0&size=100"))
                .andRespond(withStatus(HttpStatus.NO_CONTENT));

        assertThatThrownBy(() -> client.findPostsByCommunity(7L))
                .isInstanceOf(PostServiceUnavailableException.class);
    }
}

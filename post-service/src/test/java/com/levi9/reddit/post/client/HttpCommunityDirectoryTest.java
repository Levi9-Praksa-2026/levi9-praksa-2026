package com.levi9.reddit.post.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withNoContent;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withResourceNotFound;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.levi9.reddit.post.exception.CommunityServiceUnavailableException;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

/**
 * The HTTP side of the community checks: the right URLs, and how each status from community-service is read.
 * No network: {@link MockRestServiceServer} answers in place of community-service.
 */
class HttpCommunityDirectoryTest {
    private static final String BASE = "http://community-service:8082";

    private MockRestServiceServer server;
    private HttpCommunityDirectory directory;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE);
        server = MockRestServiceServer.bindTo(builder).build();
        directory = new HttpCommunityDirectory(builder.build());
    }

    @AfterEach
    void everyExpectedCallWasMade() {
        server.verify();
    }

    @Nested
    class IsActive {

        @Test
        void ok_isActive() {
            server.expect(requestTo(BASE + "/internal/communities/5"))
                    .andExpect(method(HttpMethod.GET))
                    .andRespond(withSuccess("{\"name\":\"java\",\"active\":true}", MediaType.APPLICATION_JSON));

            assertThat(directory.isActive(5)).isTrue();
        }

        @Test
        void notFound_isNotActive() {
            server.expect(requestTo(BASE + "/internal/communities/5")).andRespond(withResourceNotFound());

            assertThat(directory.isActive(5)).isFalse();
        }

        @Test
        void serverError_isUnavailable() {
            server.expect(requestTo(BASE + "/internal/communities/5")).andRespond(withServerError());

            assertThatThrownBy(() -> directory.isActive(5))
                    .isInstanceOf(CommunityServiceUnavailableException.class);
        }
    }

    @Nested
    class IsMember {

        @Test
        void noContent_isMember() {
            server.expect(requestTo(BASE + "/internal/communities/5/members/42"))
                    .andExpect(method(HttpMethod.GET))
                    .andRespond(withNoContent());

            assertThat(directory.isMember(5, 42)).isTrue();
        }

        @Test
        void notFound_isNotMember() {
            server.expect(requestTo(BASE + "/internal/communities/5/members/42")).andRespond(withResourceNotFound());

            assertThat(directory.isMember(5, 42)).isFalse();
        }
    }

    @Nested
    class NoUsableAnswer {

        @Test
        void timeout_isUnavailable() {
            server.expect(requestTo(BASE + "/internal/communities/5"))
                    .andRespond(withException(new SocketTimeoutException("Read timed out")));

            assertThatThrownBy(() -> directory.isActive(5))
                    .isInstanceOf(CommunityServiceUnavailableException.class)
                    .hasRootCauseInstanceOf(SocketTimeoutException.class);
        }

        @Test
        void connectionRefused_isUnavailable() {
            server.expect(requestTo(BASE + "/internal/communities/5/members/42"))
                    .andRespond(withException(new ConnectException("Connection refused")));

            assertThatThrownBy(() -> directory.isMember(5, 42))
                    .isInstanceOf(CommunityServiceUnavailableException.class);
        }

        /** Any other 4xx is a bug between the services, not an answer: never read as "no". */
        @Test
        void unexpectedClientError_isUnavailable() {
            server.expect(requestTo(BASE + "/internal/communities/5")).andRespond(withStatus(HttpStatus.BAD_REQUEST));

            assertThatThrownBy(() -> directory.isActive(5))
                    .isInstanceOf(CommunityServiceUnavailableException.class);
        }

        @Test
        void detailNeverLeaksTheCause() {
            server.expect(requestTo(BASE + "/internal/communities/5"))
                    .andRespond(withException(new ConnectException("community-service:8082 refused")));

            assertThatThrownBy(() -> directory.isActive(5))
                    .hasMessageNotContaining("community-service:8082");
        }
    }
}

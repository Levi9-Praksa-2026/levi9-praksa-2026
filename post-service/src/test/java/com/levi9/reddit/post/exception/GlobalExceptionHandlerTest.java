package com.levi9.reddit.post.exception;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.ProblemDetail;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    static Stream<Arguments> domainExceptions() {
        return Stream.of(
                Arguments.of(new PostNotFoundException(3L), 404, "POST_NOT_FOUND"),
                Arguments.of(new ImageNotFoundException(3L, 10L), 404, "IMAGE_NOT_FOUND"),
                Arguments.of(new NotPostAuthorException(3L), 403, "NOT_POST_AUTHOR"),
                Arguments.of(new PostRemovalForbiddenException(3L), 403, "POST_REMOVAL_FORBIDDEN"),
                Arguments.of(new NotCommunityMemberException(1L), 403, "NOT_COMMUNITY_MEMBER"),
                Arguments.of(new CommunityUnavailableException(1L), 422, "COMMUNITY_UNAVAILABLE"),
                Arguments.of(new TooManyImagesException(3), 422, "TOO_MANY_IMAGES"),
                Arguments.of(new UnsupportedImageTypeException(1), 422, "UNSUPPORTED_IMAGE_TYPE"),
                Arguments.of(new ImageTooLargeException(1, 5L * 1024 * 1024), 422, "IMAGE_TOO_LARGE"),
                Arguments.of(new CommunityServiceUnavailableException(new RuntimeException("connection refused")),
                        503, "COMMUNITY_SERVICE_UNAVAILABLE"));
    }

    @ParameterizedTest
    @MethodSource("domainExceptions")
    void mapsEachDomainExceptionToStatusAndErrorType(DomainException ex, int status, String errorType) {
        ProblemDetail problem = handler.handleDomain(ex);

        assertThat(problem.getStatus()).isEqualTo(status);
        assertThat(problem.getProperties()).containsEntry("errorType", errorType);
        assertThat(problem.getDetail()).isEqualTo(ex.getMessage());
    }

    @Test
    void unexpectedException_isBare500WithoutInternals() {
        ProblemDetail problem = handler.handleUnexpected(new IllegalStateException("db password is hunter2"));

        assertThat(problem.getStatus()).isEqualTo(500);
        assertThat(problem.getDetail()).isNull();
        assertThat(problem.getProperties()).isNull();
    }
}

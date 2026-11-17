package com.levi9.reddit.community.api;

import com.levi9.reddit.community.core.exception.DomainException;
import com.levi9.reddit.community.core.exception.ErrorType;
import com.levi9.reddit.community.core.exception.NotFoundException;
import com.levi9.reddit.community.infrastructure.PostServiceUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.List;
import java.util.Objects;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(DomainException.class)
    ProblemDetail handleDomain(DomainException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(statusOf(ex), ex.getMessage());
        problem.setProperty("errorType", ex.getErrorType().name());
        return problem;
    }

    // A failing dependency is not this service's bug. Tell the caller to retry, without leaking internals.
    @ExceptionHandler(PostServiceUnavailableException.class)
    ProblemDetail handlePostServiceUnavailable(PostServiceUnavailableException ex) {
        log.warn("Post service call failed: {}", ex.getMessage());
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_GATEWAY, "Community posts could not be loaded");
        problem.setTitle("Post service unavailable");
        problem.setProperty("errorType", ErrorType.POST_SERVICE_UNAVAILABLE.name());
        return problem;
    }

    // Security exceptions thrown from method security must reach Spring Security's own handling,
    // otherwise the catch-all below would turn a 401/403 into a 500.
    @ExceptionHandler({AccessDeniedException.class, AuthenticationException.class})
    void rethrowSecurity(RuntimeException ex) {
        throw ex;
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        return ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Bean Validation failures: keep Spring's 400 and add which fields failed.
    // The rejected value is left out on purpose, it could be a password.
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        List<FieldViolation> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> new FieldViolation(e.getField(), Objects.requireNonNullElse(e.getDefaultMessage(), "is invalid")))
                .toList();
        ProblemDetail problem = ex.getBody();
        problem.setDetail("Request validation failed");
        problem.setProperty("errors", errors);
        return handleExceptionInternal(ex, problem, headers, status, request);
    }

    private static HttpStatus statusOf(DomainException ex) {
        return switch (ex) {
            case NotFoundException _ -> HttpStatus.NOT_FOUND;
        };
    }

    record FieldViolation(String field, String message) {}
}

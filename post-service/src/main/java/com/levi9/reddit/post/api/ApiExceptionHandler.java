package com.levi9.reddit.post.api;

import com.levi9.reddit.post.core.exception.DomainException;
import com.levi9.reddit.post.core.exception.ForbiddenException;
import com.levi9.reddit.post.core.exception.NotFoundException;
import com.levi9.reddit.post.core.exception.ValidationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Turns exceptions into RFC 9457 problem details (see docs/error-convention.md). The base class already does this
 * for Spring's own errors, e.g. a bad {@code page} or {@code size} parameter becomes a 400.
 */
@RestControllerAdvice
class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(DomainException.class)
    ProblemDetail handleDomain(DomainException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(statusOf(ex), ex.getMessage());
        problem.setProperty("errorType", ex.getErrorType().name());
        return problem;
    }

    // Sealed hierarchy: a new DomainException subtype doesn't compile until it gets a status here.
    private static HttpStatus statusOf(DomainException ex) {
        return switch (ex) {
            case NotFoundException _ -> HttpStatus.NOT_FOUND;
            case ForbiddenException _ -> HttpStatus.FORBIDDEN;
            case ValidationException _ -> HttpStatus.UNPROCESSABLE_CONTENT;
        };
    }
}

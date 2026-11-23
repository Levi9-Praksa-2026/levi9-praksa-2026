package com.levi9.reddit.auth.exception;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Checks the JSON shape every error leaves auth-service with, as described in docs/error-convention.md. */
class GlobalExceptionHandlerTest {

    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new ThrowingController())
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    void mapsEachDomainExceptionToItsStatusWithErrorType() throws Exception {
        expectProblem("unauthorized", 401, "INVALID_CREDENTIALS", "Invalid username or password");
        expectProblem("forbidden", 403, "ACCOUNT_DELETION_FORBIDDEN", "This account cannot be deleted");
        expectProblem("conflict", 409, "USERNAME_TAKEN", "Username is already taken");
        expectProblem("not-found", 404, "USER_NOT_FOUND", "User not found");
    }

    @Test
    void addsTheBanReasonForABannedUser() throws Exception {
        mvc.perform(get("/throw/banned"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorType").value("USER_BANNED"))
                .andExpect(jsonPath("$.banReason").value("Spam"));
    }

    @Test
    void leavesOutTheBanReasonWhenThereIsNone() throws Exception {
        mvc.perform(get("/throw/banned-without-reason"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorType").value("USER_BANNED"))
                .andExpect(jsonPath("$.banReason").doesNotExist());
    }

    @Test
    void hidesTheCauseOfAnUnexpectedError() throws Exception {
        mvc.perform(get("/throw/bug"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").doesNotExist())
                .andExpect(jsonPath("$.errorType").doesNotExist());
    }

    @Test
    void listsTheFieldsThatFailedValidation() throws Exception {
        mvc.perform(post("/throw/validate").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\" \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Request validation failed"))
                .andExpect(jsonPath("$.errors[0].field").value("name"))
                .andExpect(jsonPath("$.errors[0].message").isNotEmpty())
                .andExpect(jsonPath("$.errorType").doesNotExist());
    }

    @Test
    void passesSecurityExceptionsOnInsteadOfTurningThemInto500() {
        // Rethrown so Spring Security answers 401/403 itself; without a security filter here it surfaces as-is.
        assertThatThrownBy(() -> mvc.perform(get("/throw/access-denied")))
                .hasRootCauseInstanceOf(AccessDeniedException.class);
    }

    private void expectProblem(String path, int status, String errorType, String detail) throws Exception {
        mvc.perform(get("/throw/" + path))
                .andExpect(status().is(status))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(status))
                .andExpect(jsonPath("$.errorType").value(errorType))
                .andExpect(jsonPath("$.detail").value(detail));
    }

    record NameRequest(@NotBlank String name) {}

    // A non-static inner class on purpose: component scanning skips those, so this controller exists only in
    // this test's standaloneSetup and never shows up in another @SpringBootTest.
    @RestController
    class ThrowingController {

        @GetMapping("/throw/{kind}")
        void fail(@PathVariable String kind) {
            throw switch (kind) {
                case "unauthorized" -> new UnauthorizedException(ErrorType.INVALID_CREDENTIALS, "Invalid username or password");
                case "forbidden" -> new ForbiddenException(ErrorType.ACCOUNT_DELETION_FORBIDDEN, "This account cannot be deleted");
                case "conflict" -> new ConflictException(ErrorType.USERNAME_TAKEN, "Username is already taken");
                case "not-found" -> new NotFoundException(ErrorType.USER_NOT_FOUND, "User not found");
                case "banned" -> new UserBannedException("Spam");
                case "banned-without-reason" -> new UserBannedException(null);
                case "access-denied" -> new AccessDeniedException("denied");
                default -> new IllegalStateException("database password is hunter2");
            };
        }

        @PostMapping("/throw/validate")
        void validate(@Valid @RequestBody NameRequest request) {
        }
    }
}

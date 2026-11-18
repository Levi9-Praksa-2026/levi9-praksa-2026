package com.levi9.reddit.auth.api;

import com.levi9.reddit.auth.MutableClock;
import com.levi9.reddit.auth.contracts.AuthResponse;
import com.levi9.reddit.auth.core.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.Duration;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Rate limits on login and register, per client IP (workspace DECISIONS.md, 2026-11-18). Small limits here so the
 * rules are visible: login 3 per minute (one back every 20 s), register 2 per hour (one back every 30 min).
 * The context is shared between tests, so each test uses its own client IP and starts with a full budget.
 */
@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, RateLimitTest.TestClock.class})
@TestPropertySource(properties = {
        "app.rate-limit.login.requests=3",
        "app.rate-limit.login.per=1m",
        "app.rate-limit.register.requests=2",
        "app.rate-limit.register.per=1h"})
class RateLimitTest {
    private static final AuthResponse TOKENS = new AuthResponse("access.jwt", "refresh-token", 900);
    private static final String LOGIN_BODY = """
            {"email":"marko@example.test","password":"correct horse battery"}""";
    private static final String REGISTER_BODY = """
            {"username":"marko","email":"marko@example.test","password":"correct horse battery",
             "firstName":"Marko","lastName":"Markovic"}""";

    @TestConfiguration(proxyBeanMethods = false)
    static class TestClock {
        @Bean
        @Primary
        MutableClock mutableClock() {
            return new MutableClock();
        }
    }

    @Autowired
    private MockMvc mvc;

    @Autowired
    private MutableClock clock;

    @MockitoBean
    private AuthService auth;

    // --- Login ---

    @Test
    void loginAllowsThreeAttemptsPerClientThenAnswers429WithRetryAfter() throws Exception {
        whenServiceSucceeds();
        String client = "203.0.113.1";

        for (int i = 0; i < 3; i++) {
            login(client).andExpect(status().isOk());
        }

        login(client)
                .andExpect(status().isTooManyRequests())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.errorType").value("RATE_LIMITED"))
                .andExpect(header().string("Retry-After", "20"));
    }

    @Test
    void aBlockedAttemptNeverReachesTheService() throws Exception {
        whenServiceSucceeds();
        String client = "203.0.113.2";

        for (int i = 0; i < 4; i++) {
            login(client);
        }

        verify(auth, times(3)).login(any());
    }

    @Test
    void invalidRequestsCountTowardsTheLimit() throws Exception {
        whenServiceSucceeds();
        String client = "203.0.113.3";

        for (int i = 0; i < 3; i++) {
            postJson("/api/auth/login", "{}", client).andExpect(status().isBadRequest());
        }

        login(client).andExpect(status().isTooManyRequests());
    }

    @Test
    void eachClientIpHasItsOwnLimit() throws Exception {
        whenServiceSucceeds();
        String busy = "203.0.113.4";

        for (int i = 0; i < 3; i++) {
            login(busy);
        }

        login(busy).andExpect(status().isTooManyRequests());
        login("203.0.113.5").andExpect(status().isOk());
    }

    @Test
    void oneAttemptComesBackEveryTwentySeconds() throws Exception {
        whenServiceSucceeds();
        String client = "203.0.113.6";
        for (int i = 0; i < 3; i++) {
            login(client);
        }

        clock.advance(Duration.ofSeconds(19));
        login(client).andExpect(status().isTooManyRequests());

        clock.advance(Duration.ofSeconds(1));
        login(client).andExpect(status().isOk());
        login(client).andExpect(status().isTooManyRequests());
    }

    // --- Register, and the routes kept apart ---

    @Test
    void registerAllowsTwoPerClientPerHourThenAnswers429() throws Exception {
        whenServiceSucceeds();
        String client = "203.0.113.7";

        register(client).andExpect(status().isCreated());
        register(client).andExpect(status().isCreated());

        register(client)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.errorType").value("RATE_LIMITED"))
                .andExpect(header().string("Retry-After", "1800"));
    }

    @Test
    void usingUpTheLoginLimitLeavesRegisterAvailable() throws Exception {
        whenServiceSucceeds();
        String client = "203.0.113.8";
        for (int i = 0; i < 3; i++) {
            login(client);
        }

        login(client).andExpect(status().isTooManyRequests());
        register(client).andExpect(status().isCreated());
    }

    @Test
    void refreshIsNotLimited() throws Exception {
        whenServiceSucceeds();
        String client = "203.0.113.9";

        for (int i = 0; i < 10; i++) {
            postJson("/api/auth/refresh", """
                    {"refreshToken":"refresh-token"}""", client).andExpect(status().isOk());
        }
    }

    private void whenServiceSucceeds() {
        when(auth.login(any())).thenReturn(TOKENS);
        when(auth.register(any())).thenReturn(TOKENS);
        when(auth.refresh(any())).thenReturn(TOKENS);
    }

    private ResultActions login(String clientIp) throws Exception {
        return postJson("/api/auth/login", LOGIN_BODY, clientIp);
    }

    private ResultActions register(String clientIp) throws Exception {
        return postJson("/api/auth/register", REGISTER_BODY, clientIp);
    }

    private ResultActions postJson(String path, String body, String clientIp) throws Exception {
        return mvc.perform(post(path).with(from(clientIp)).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private static RequestPostProcessor from(String clientIp) {
        return request -> {
            request.setRemoteAddr(clientIp);
            return request;
        };
    }
}

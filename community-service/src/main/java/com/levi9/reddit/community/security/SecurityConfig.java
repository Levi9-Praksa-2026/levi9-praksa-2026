package com.levi9.reddit.community.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.json.ProblemDetailJacksonMixin;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            ObjectProvider<ObjectMapper> objectMappers,
            @Value("${app.mock-auth.enabled:false}") boolean mockAuthEnabled) throws Exception {
        // Jackson 2's builder keeps Spring's ProblemDetail mixin; the Spring builder is deprecated since 7.0.
        ObjectMapper mapper = objectMappers.getIfAvailable(() -> JsonMapper.builder()
                .addMixIn(ProblemDetail.class, ProblemDetailJacksonMixin.class)
                .build());
        AuthenticationEntryPoint unauthorized = (request, response, failure) -> writeProblem(
                mapper, response, HttpStatus.UNAUTHORIZED, "Authentication is required", request.getRequestURI());

        http
                .csrf(AbstractHttpConfigurer::disable) // no cookies: the token travels in a header
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/communities", "/api/communities/**").permitAll()
                        // URL rules run before validation, so a non-admin gets 403 even with an invalid body.
                        // Match only the ADMIN paths; e.g. DELETE .../members/me must stay a user operation.
                        .requestMatchers(HttpMethod.POST, "/api/communities", "/api/communities/*/reactivate").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/communities/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/communities/*").hasRole("ADMIN")
                        .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/error").permitAll()
                        .anyRequest().authenticated())
                // Access tokens from auth-service; roles become ROLE_ authorities (application.yml).
                // A missing, expired or invalid token gets the same 401 body as no caller at all.
                .oauth2ResourceServer(oauth -> oauth
                        .jwt(Customizer.withDefaults())
                        .authenticationEntryPoint(unauthorized))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint(unauthorized)
                        .accessDeniedHandler((request, response, failure) -> writeProblem(
                                mapper, response, HttpStatus.FORBIDDEN, "Access is denied",
                                request.getRequestURI())));

        if (mockAuthEnabled) {
            // Runs after the token filter: a request with a real token keeps its own caller.
            log.warn("MOCK AUTH ENABLED: every request without a token is treated as ROLE_ADMIN. "
                    + "Never enable app.mock-auth in production.");
            http.addFilterBefore(new MockAuthenticationFilter(), AnonymousAuthenticationFilter.class);
        }
        return http.build();
    }

    private static void writeProblem(ObjectMapper mapper, HttpServletResponse response, HttpStatus status,
            String detail, String instance) throws IOException {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setInstance(URI.create(instance));
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        mapper.writeValue(response.getOutputStream(), problem);
    }
}

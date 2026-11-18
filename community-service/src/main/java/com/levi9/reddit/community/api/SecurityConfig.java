package com.levi9.reddit.community.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
class SecurityConfig {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            @Value("${app.mock-auth.enabled:true}") boolean mockAuthEnabled) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable) // no cookies: the token travels in a header
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/communities", "/api/communities/**").permitAll()
                        .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/error").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, failure) -> writeProblem(
                                MAPPER, response, HttpStatus.UNAUTHORIZED, "Authentication is required",
                                request.getRequestURI()))
                        .accessDeniedHandler((request, response, failure) -> writeProblem(
                                MAPPER, response, HttpStatus.FORBIDDEN, "Access is denied",
                                request.getRequestURI())));

        if (mockAuthEnabled) {
            // Temporary: auth-service cannot issue tokens yet. Real JWT validation replaces this.
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

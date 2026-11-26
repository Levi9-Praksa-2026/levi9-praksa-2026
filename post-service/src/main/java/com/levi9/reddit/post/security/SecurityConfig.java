package com.levi9.reddit.post.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;

/**
 * Reading posts and comments is public. Everything else needs a caller.
 *
 * <p>Callers are identified by auth-service's access tokens. {@code app.mock-auth.enabled=true} (local only) also
 * registers {@link MockAuthenticationFilter}, which runs after the token filter and only makes up a caller when the
 * request has no token.
 */
@Configuration(proxyBeanMethods = false)
@Slf4j
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            @Value("${app.mock-auth.enabled:false}") boolean mockAuthEnabled) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable) // no cookies: the token travels in a header
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/posts", "/api/posts/**").permitAll()
                        .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/error").permitAll()
                        .anyRequest().authenticated())
                // Access tokens from auth-service; roles become ROLE_ authorities (application.yml).
                // A missing, expired or invalid token gets the same 401 body as no caller at all.
                .oauth2ResourceServer(oauth -> oauth
                        .jwt(Customizer.withDefaults())
                        .authenticationEntryPoint(ProblemResponses.unauthorized()))
                // Problem details for errors raised before any controller runs, instead of Spring's empty-bodied 401/403.
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint(ProblemResponses.unauthorized())
                        .accessDeniedHandler(ProblemResponses.forbidden()));

        if (mockAuthEnabled) {
            log.warn("MOCK AUTH ENABLED: every request without a token gets a made-up caller (X-Mock-* headers). "
                    + "Never enable app.mock-auth in production.");
            http.addFilterBefore(new MockAuthenticationFilter(), AnonymousAuthenticationFilter.class);
        }
        return http.build();
    }
}

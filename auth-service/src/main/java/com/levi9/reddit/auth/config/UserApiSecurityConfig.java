package com.levi9.reddit.auth.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

/**
 * auth-service's own API, {@code /api/users/**} and the admin routes under {@code /api/admin/**}, as a resource
 * server: the same as any service behind the gateway.
 * The gateway sends the user's access token; this chain accepts that and nothing else.
 * <p>
 * Its own chain, apart from login's, because the gateway also forwards the browser's cookies, auth-service's login
 * session among them. Here the session is never read, so a cookie alone never counts as logged in, and with no
 * cookie to ride on, CSRF protection has nothing to protect.
 * <p>
 * {@code @EnableMethodSecurity} switches on {@code @PreAuthorize} (e.g. the admin-only ban endpoints). Without it those
 * annotations are silently ignored, and any logged-in user would pass.
 */
@Configuration(proxyBeanMethods = false)
@EnableMethodSecurity
public class UserApiSecurityConfig {

    @Bean
    @Order(2)
    SecurityFilterChain userApiChain(HttpSecurity http) throws Exception {
        http.securityMatcher("/api/users/**", "/api/admin/**")
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(AbstractHttpConfigurer::disable)
                .oauth2ResourceServer(resourceServer -> resourceServer
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(rolesAsAuthorities())))
                .authorizeHttpRequests(auth -> auth
                        // The team's prefix for admin routes: any endpoint under it is admin-only by its path alone.
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated());
        return http.build();
    }

    /**
     * The token's {@code roles} claim ({@code ["ADMIN"]}) as Spring authorities ({@code ROLE_ADMIN}), so
     * {@code hasRole("ADMIN")} works. Spring's default reads {@code scope} instead. The principal's name stays
     * {@code sub}, the user id.
     */
    static JwtAuthenticationConverter rolesAsAuthorities() {
        var authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName("roles");
        authorities.setAuthorityPrefix("ROLE_");
        var converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }
}

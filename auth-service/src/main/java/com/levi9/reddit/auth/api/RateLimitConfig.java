package com.levi9.reddit.auth.api;

import com.levi9.reddit.auth.infrastructure.config.ClockConfig;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.time.Clock;

/**
 * Puts a rate limit on login and register, each with its own budget per client IP (see {@link RateLimitInterceptor}).
 * Refresh is not limited: its token is 256 random bits, so guessing one is hopeless anyway.
 * <p>
 * Imports {@link ClockConfig} itself, because {@code @WebMvcTest} slices load this class but not the clock.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(RateLimitProperties.class)
@Import(ClockConfig.class)
class RateLimitConfig implements WebMvcConfigurer {
    private final RateLimitProperties limits;
    private final Clock clock;

    RateLimitConfig(RateLimitProperties limits, Clock clock) {
        this.limits = limits;
        this.clock = clock;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new RateLimitInterceptor(limits.login(), clock)).addPathPatterns("/api/auth/login");
        registry.addInterceptor(new RateLimitInterceptor(limits.register(), clock)).addPathPatterns("/api/auth/register");
    }
}

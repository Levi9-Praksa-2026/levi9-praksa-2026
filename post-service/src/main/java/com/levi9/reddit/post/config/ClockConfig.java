package com.levi9.reddit.post.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The current time as a bean. Code asks the clock instead of calling {@code Instant.now()},
 * so a test can pass a fixed clock and check time windows exactly.
 */
@Configuration(proxyBeanMethods = false)
class ClockConfig {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}

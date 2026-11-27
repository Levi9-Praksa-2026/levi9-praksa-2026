package com.levi9.reddit.auth.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.zaxxer.hikari.HikariDataSource;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

class DataSourceRotationRefresherTest {

    @Test
    void pushesRotatedPasswordIntoPool() {
        try (HikariDataSource dataSource = new HikariDataSource()) {
            StandardEnvironment environment = new StandardEnvironment();
            environment.getPropertySources().addFirst(
                    new MapPropertySource("rotated", Map.of("spring.datasource.password", "new-password")));

            new DataSourceRotationRefresher(dataSource, environment).applyRotatedPassword();

            assertEquals("new-password", dataSource.getPassword());
        }
    }
}

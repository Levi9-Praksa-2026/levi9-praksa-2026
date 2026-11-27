package com.levi9.reddit.community.config;

import javax.sql.DataSource;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cloud.context.scope.refresh.RefreshScopeRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Spring Cloud AWS refreshes the Environment when the RDS-managed secret changes, but the Hikari pool was built
 * at startup and keeps its old password. Push the refreshed password into the pool itself and retire the stale
 * connections. Only registered in AWS, where the reload settings are set.
 */
@Component
@ConditionalOnProperty(name = "spring.cloud.aws.secretsmanager.reload.strategy")
class DataSourceRotationRefresher {
    private final DataSource dataSource;
    private final Environment environment;

    DataSourceRotationRefresher(DataSource dataSource, Environment environment) {
        this.dataSource = dataSource;
        this.environment = environment;
    }

    @EventListener(RefreshScopeRefreshedEvent.class)
    void applyRotatedPassword() {
        if (dataSource instanceof HikariDataSource hikari) {
            String password = environment.getProperty("spring.datasource.password");
            if (password != null) {
                hikari.getHikariConfigMXBean().setPassword(password);
                var pool = hikari.getHikariPoolMXBean();
                if (pool != null) {
                    pool.softEvictConnections();
                }
            }
        }
    }
}

package com.levi9.reddit.post;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.test.context.DynamicPropertyRegistrar;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {

	@Bean
	@ServiceConnection
	PostgreSQLContainer postgresContainer() {
		return new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));
	}

	@Bean
	GenericContainer<?> motoContainer() {
		return new GenericContainer<>(DockerImageName.parse("motoserver/moto:5.2.5"))
				.withExposedPorts(5000);
	}

	@Bean
	DynamicPropertyRegistrar s3Endpoint(GenericContainer<?> motoContainer) {
		return registry -> registry.add("app.s3.endpoint",
				() -> "http://" + motoContainer.getHost() + ":" + motoContainer.getMappedPort(5000));
	}

}

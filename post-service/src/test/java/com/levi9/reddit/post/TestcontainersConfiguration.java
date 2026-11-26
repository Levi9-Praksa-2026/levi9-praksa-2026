package com.levi9.reddit.post;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import com.levi9.reddit.post.client.CommunityDirectory;
import java.util.Optional;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
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

	/**
	 * Stands in for community-service in tests that start the whole app (the HTTP client itself is tested in
	 * {@code HttpCommunityDirectoryTest}). Every community is active (named "community" plus its id) and every user a member, except
	 * {@link #UNAVAILABLE_COMMUNITY} and {@link #NON_MEMBER}.
	 */
	@Bean
	@Primary
	CommunityDirectory fakeCommunityDirectory() {
		return new CommunityDirectory() {
			@Override
			public Optional<String> findActiveName(long communityId) {
				return communityId == UNAVAILABLE_COMMUNITY ? Optional.empty() : Optional.of("community" + communityId);
			}

			@Override
			public boolean isMember(long communityId, long userId) {
				return findActiveName(communityId).isPresent() && userId != NON_MEMBER;
			}
		};
	}

	static final long UNAVAILABLE_COMMUNITY = 999L;
	static final long NON_MEMBER = 999L;

}

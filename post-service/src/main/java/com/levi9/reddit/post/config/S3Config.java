package com.levi9.reddit.post.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;

@Configuration
@EnableConfigurationProperties(S3Properties.class)
class S3Config {

	@Bean
	S3Client s3Client(S3Properties props) {
		var builder = S3Client.builder().region(Region.of(props.region()));
		if (props.endpoint() != null) {
			builder.endpointOverride(props.endpoint())
					.forcePathStyle(true)
					.credentialsProvider(StaticCredentialsProvider.create(
							AwsBasicCredentials.create("test", "test")));
		}
		return builder.build();
	}

	@Bean
	ApplicationRunner createLocalBucket(S3Client s3, S3Properties props) {
		return args -> {
			if (props.endpoint() == null) {
				return;
			}
			try {
				s3.headBucket(b -> b.bucket(props.bucket()));
			}
			catch (NoSuchBucketException e) {
				s3.createBucket(b -> b.bucket(props.bucket()));
			}
		};
	}

}

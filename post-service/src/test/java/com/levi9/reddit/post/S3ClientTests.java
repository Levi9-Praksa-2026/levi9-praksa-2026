package com.levi9.reddit.post;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import com.levi9.reddit.post.storage.S3Properties;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class S3ClientTests {

	@Autowired
	S3Client s3;

	@Autowired
	S3Properties props;

	@Test
	void putObject_thenGetObject_returnsSameContent() {
		s3.putObject(b -> b.bucket(props.bucket()).key("posts/1/a.png"), RequestBody.fromString("hello"));

		var stored = s3.getObjectAsBytes(b -> b.bucket(props.bucket()).key("posts/1/a.png")).asUtf8String();

		assertThat(stored).isEqualTo("hello");
	}

}

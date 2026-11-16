package com.levi9.reddit.community;

import org.springframework.boot.SpringApplication;

public class TestCommunityServiceApplication {

	public static void main(String[] args) {
		SpringApplication.from(CommunityServiceApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}

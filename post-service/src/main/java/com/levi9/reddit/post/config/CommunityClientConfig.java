package com.levi9.reddit.post.config;

import com.levi9.reddit.post.client.CommunityDirectory;
import com.levi9.reddit.post.client.CommunityServiceProperties;
import com.levi9.reddit.post.client.HttpCommunityDirectory;
import java.net.http.HttpClient;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * The community-service client. Short timeouts: the checks run while a user waits for their post, and a slow
 * community-service should turn into a quick 503, not a hanging request.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(CommunityServiceProperties.class)
class CommunityClientConfig {

    @Bean
    CommunityDirectory communityDirectory(CommunityServiceProperties properties) {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(properties.connectTimeout())
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(properties.readTimeout());

        RestClient http = RestClient.builder()
                .baseUrl(properties.url().toString())
                .requestFactory(requestFactory)
                .build();
        return new HttpCommunityDirectory(http);
    }
}

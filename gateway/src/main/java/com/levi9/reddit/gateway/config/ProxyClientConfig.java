package com.levi9.reddit.gateway.config;

import org.apache.hc.client5.http.impl.classic.HttpClientBuilder;
import org.springframework.boot.http.client.HttpComponentsClientHttpRequestFactoryBuilder;
import org.springframework.boot.http.client.autoconfigure.ClientHttpRequestFactoryBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The HTTP client the gateway forwards requests with (Apache HttpClient, see pom.xml).
 */
@Configuration(proxyBeanMethods = false)
class ProxyClientConfig {

    /**
     * No cookie jar. Apache HttpClient keeps one by default, shared by the whole gateway: it saved auth-service's
     * JSESSIONID from a request that came without cookies and sent it on every later cookieless request, from
     * anyone, so one user's login session reached another (measured 2026-11-24). The browser holds every cookie;
     * the gateway only passes them on.
     */
    @Bean
    ClientHttpRequestFactoryBuilderCustomizer<HttpComponentsClientHttpRequestFactoryBuilder> noCookieJar() {
        return builder -> builder.withHttpClientCustomizer(HttpClientBuilder::disableCookieManagement);
    }
}

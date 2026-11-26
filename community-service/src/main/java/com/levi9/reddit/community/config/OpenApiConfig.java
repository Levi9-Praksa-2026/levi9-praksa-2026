package com.levi9.reddit.community.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class OpenApiConfig {

    /**
     * A relative server, so Swagger UI's "Try it out" calls whichever origin served the page: the gateway (the usual
     * way, with the session's token) or this service itself. Without it the document names this service's own
     * address, which the browser can't reach inside Docker.
     */
    @Bean
    OpenAPI openApi() {
        return new OpenAPI().addServersItem(new Server().url("/"));
    }
}

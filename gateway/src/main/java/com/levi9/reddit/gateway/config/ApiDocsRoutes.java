package com.levi9.reddit.gateway.config;

import static org.springframework.cloud.gateway.server.mvc.filter.BeforeFilterFunctions.removeRequestHeader;
import static org.springframework.cloud.gateway.server.mvc.filter.BeforeFilterFunctions.setPath;
import static org.springframework.cloud.gateway.server.mvc.filter.BeforeFilterFunctions.uri;
import static org.springframework.cloud.gateway.server.mvc.handler.GatewayRouterFunctions.route;
import static org.springframework.cloud.gateway.server.mvc.handler.HandlerFunctions.http;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerResponse;

/**
 * Dev only: Swagger UI on the gateway reads each service's OpenAPI document through these routes
 * ({@code /api-docs/community} is community-service's {@code /v3/api-docs}). In Java rather than application.yml
 * because a profile can't add to the base route list, only replace it, and production must not have these routes.
 * The documents are public, so the caller's cookies and token stay behind.
 */
@Configuration(proxyBeanMethods = false)
@Profile("dev")
class ApiDocsRoutes {

    @Bean
    RouterFunction<ServerResponse> serviceApiDocs(   // not apiDocsRoutes: that's this class's own bean name
            @Value("${AUTH_SERVICE_URL:http://localhost:8081}") String authService,
            @Value("${COMMUNITY_SERVICE_URL:http://localhost:8082}") String communityService,
            @Value("${POST_SERVICE_URL:http://localhost:8083}") String postService) {
        return docs("auth", authService)
                .and(docs("community", communityService))
                .and(docs("post", postService));
    }

    private static RouterFunction<ServerResponse> docs(String service, String serviceUrl) {
        return route("api-docs-" + service)
                .GET("/api-docs/" + service, http())
                .before(uri(serviceUrl))
                .before(setPath("/v3/api-docs"))
                .before(removeRequestHeader("Authorization"))
                .before(removeRequestHeader("Cookie"))
                .build();
    }
}

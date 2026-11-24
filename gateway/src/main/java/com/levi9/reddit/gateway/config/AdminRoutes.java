package com.levi9.reddit.gateway.config;

import com.levi9.reddit.gateway.security.AdminMaskingFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerRequest;
import org.springframework.web.servlet.function.ServerResponse;

import static org.springframework.cloud.gateway.server.mvc.filter.BeforeFilterFunctions.removeRequestHeader;
import static org.springframework.cloud.gateway.server.mvc.filter.BeforeFilterFunctions.uri;
import static org.springframework.cloud.gateway.server.mvc.handler.GatewayRouterFunctions.route;
import static org.springframework.cloud.gateway.server.mvc.handler.HandlerFunctions.http;

/** Admin requests relay precisely the access token checked before CSRF, without resolving it a second time. */
@Configuration(proxyBeanMethods = false)
class AdminRoutes {
    @Bean
    RouterFunction<ServerResponse> adminUserRoutes(@Value("${AUTH_SERVICE_URL:http://localhost:8081}") String auth) {
        return route("admin-users")
                .route(request -> request.path().equals("/api/admin/users")
                        || request.path().startsWith("/api/admin/users/"), http())
                .before(uri(auth))
                .before(removeRequestHeader("Authorization"))
                .filter((request, next) -> {
                    Object token = request.servletRequest().getAttribute(AdminMaskingFilter.CHECKED_TOKEN);
                    if (!(token instanceof String checked)) {
                        return ServerResponse.notFound().build(); // fail closed if the gate was bypassed internally
                    }
                    return next.handle(ServerRequest.from(request)
                            .headers(headers -> headers.setBearerAuth(checked)).build());
                })
                .build();
    }
}

# Security convention

How a logged-in request is authenticated in every levddit service. auth-service issues the tokens;
gateway, community-service and post-service only check them.

## Tokens

| Token | What it is | Lifetime | Where it is checked |
|---|---|---|---|
| Access token | JWT signed by auth-service with RS256 | 15 minutes | Gateway and every service, with the public key. No database. |
| Refresh token | Random opaque string, stored only as a SHA-256 hash | 7 days | Only auth-service, against `auth.refresh_tokens` |

- **Only auth-service holds the private key.** It signs access tokens and nothing else ever can.
- **Everyone else gets the public key** from auth-service's JWKS endpoint, `GET /.well-known/jwks.json`. A public
  key can check a signature but cannot create one, so it is safe to hand out.
- Nobody calls the JWKS endpoint from code. The Spring resource server fetches it from config, caches the key and
  fetches again when a token arrives with an unknown `kid` (key id).

## How a request travels

1. The frontend logs in through the gateway: `POST /api/auth/login`. auth-service returns both tokens in the body.
2. Every later request carries `Authorization: Bearer <access token>` and goes to the **gateway**.
3. The gateway checks the token (signature, expiry, issuer). Invalid or expired: 401, the request stops here.
   Valid: it forwards the request with the **same, unchanged** `Authorization` header.
4. The service checks the same token again with its own cached public key, then reads the user from it.

Services check again so they never trust that a request came through the gateway. Only the frontend, gateway and
Postgres are published to the host; services are reachable only inside the Docker network.

**The gateway does not decide which routes need a login.** It rejects a token that is present but invalid
(forged, expired, wrong issuer) and lets a request without a token through. Each service's `SecurityConfig` decides
what is public and what needs a token, so the list of public routes lives in one place: the service that owns them.

Direct service-to-service traffic: services fetching JWKS from auth-service, and `/internal/**` calls, which the
gateway never exposes.

## Access token claims

| Claim | Value | Use |
|---|---|---|
| `iss` | `levddit-auth` | Reject tokens from anyone else |
| `sub` | User id, as a string | Who is calling. **Always take the user id from here, never from the request body.** |
| `username` | Username | Copied onto posts and comments (`author_username`) |
| `roles` | e.g. `["USER"]` or `["ADMIN"]` | Mapped to `ROLE_USER` / `ROLE_ADMIN` |
| `exp`, `iat` | Expiry and issue time | Checked automatically |

> Claim names are part of the contract between all services. **Proposed, pending team confirmation.**

## Adding it to your service

The dependency `spring-boot-starter-security-oauth2-resource-server` is already in every service's pom.

### 1. `application.yml`

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          jwk-set-uri: ${AUTH_JWKS_URI:http://localhost:8081/.well-known/jwks.json}
          issuer-uri: levddit-auth
          authorities-claim-name: roles
          authority-prefix: ROLE_
```

- `jwk-set-uri`: where to fetch the public key. This is the only key-related setting.
- `issuer-uri`: used only for the `iss` check here, because `jwk-set-uri` supplies the keys. Cover it with a test
  (a token with a different `iss` must get 401) in the first service that adds it.
- `authorities-claim-name` + `authority-prefix`: turn our `roles` claim into Spring authorities from config alone,
  so `hasRole('ADMIN')` works without a custom converter.

### 2. `docker-compose.yml`

```yaml
  post-service:
    environment:
      <<: *db-env
      AUTH_JWKS_URI: http://auth-service:8081/.well-known/jwks.json
```

### 3. `SecurityConfig`

```java
@Configuration(proxyBeanMethods = false)
class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable) // stateless API with bearer tokens, no cookies
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/posts/**", "/api/comments/**").permitAll()
                        .requestMatchers("/actuator/health/**").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()));
        return http.build();
    }
}
```

- `.oauth2ResourceServer(... jwt ...)` switches on bearer-JWT authentication.
- Public routes come from the endpoints document ("public" = no login). Everything else needs a token.
- `anyRequest().authenticated()` stays **last**, so a new endpoint is closed until someone opens it on purpose.
- CSRF is off only because there are no auth cookies. If auth ever moves to cookies, CSRF protection comes back.

### 4. Reading the caller in a controller

```java
@PostMapping
ResponseEntity<PostResponse> create(@Valid @RequestBody CreatePostRequest request,
                                    @AuthenticationPrincipal Jwt jwt) {
    long authorId = Long.parseLong(jwt.getSubject());
    String authorUsername = jwt.getClaimAsString("username");
    ...
}
```

Role gates that only depend on the role ("ADMIN only") can be URL rules or `@PreAuthorize("hasRole('ADMIN')")`
(needs `@EnableMethodSecurity`). Rules about **which** row ("author or ADMIN", "member of this community") belong
in the service: pass the caller's id and roles in, and let the service decide.

### 5. Tests

Tests never call auth-service. `spring-security-test` creates an authenticated JWT directly:

```java
mockMvc.perform(post("/api/posts")
                .with(jwt().jwt(j -> j.subject("42").claim("username", "marko"))
                           .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isCreated());
```

Every protected endpoint gets at least: no token → 401, wrong role or not the owner → 403, correct caller → success.

## Errors from the security layer

A missing, expired or invalid token is rejected by the security filters **before** any controller runs, so
`GlobalExceptionHandler` never sees it (see `error-convention.md`). Each service must configure an
`AuthenticationEntryPoint` (401) and `AccessDeniedHandler` (403) that write the same problem-detail shape, without
an `errorType`. A shared example will be added with auth-service's resource-server setup.

## Rules

- Never log tokens, refresh-token hashes or passwords.
- Never put a token in a URL or query string. Only the `Authorization` header.
- The user id comes from `sub`, never from the request.
- New endpoints are closed by default; opening one is a deliberate line in `SecurityConfig`.

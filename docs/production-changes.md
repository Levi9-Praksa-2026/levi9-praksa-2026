# Things to change in production

Local defaults that are fine for `docker compose up` on a laptop but must change before the AWS deploy.
Add an entry whenever you introduce a local-only shortcut. Each entry says what to change and why.

## Profiles
- Each service's base `application.yml` is the production configuration: no fallback secrets, cookies only over
  HTTPS. A missing required value stops startup instead of running with a local shortcut.
- Local shortcuts live in `application-dev.yml`. `docker-compose.yml` sets `SPRING_PROFILES_ACTIVE=dev`; in
  IntelliJ, put `dev` in the run configuration's Active profiles.
- **Production:** run with no profile (or `prod`), **never `dev`**. There is no `application-prod.yml` yet because
  nothing is production-only; add one when something is.

## auth-service

### JWT signing key
- **Local:** the dev profile sets `app.jwt.generate-key: true`, so auth-service generates a temporary key pair in
  memory at every start. Nothing secret is needed, but every restart invalidates issued access tokens.
- **Production:** without the dev profile the flag is `false`. Create one key pair and give auth-service:
  - `APP_JWT_PRIVATE_KEY`: the contents of `private.pem` (one line or several both work)
  - `APP_JWT_KEY_ID`: a name for the key, for example `2026-11`

  ```bash
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private.pem
  ```
- Only auth-service gets the private key. The other services need nothing secret: they fetch the public key
  from auth-service's `/oauth2/jwks`.
- Never commit `private.pem`. Store it in the environment settings of the deploy target or a secret store.
- If neither a key nor the flag is set, auth-service refuses to start. That is on purpose.

### OAuth: public URL, gateway client secret, session cookie
- **Local:** the dev profile falls back to `http://localhost:3000` for the public URL (the issuer in every token,
  and the base of the gateway's redirect URI), `local-gateway-secret` for the client secret, and allows the session
  cookie over plain HTTP.
- **Production:**
  - `APP_PUBLIC_URL`: the site's own `https://` origin, exactly as the browser sees it, no trailing slash.
    auth-service refuses to start without it.
  - `APP_OAUTH_GATEWAY_CLIENT_SECRET`: a long random value (`openssl rand -base64 32`), given to auth-service and
    the gateway alike. auth-service refuses to start without it.
  - The login session cookie is HTTPS-only by default; nothing to set.

### Rate limits and the client IP
- Login (10 per minute) and register (10 per hour) are limited per client IP, in memory. One auth-service
  instance is assumed: with several, each counts on its own, so the real limit multiplies.
- The client IP comes from the gateway's `X-Forwarded-For` (`server.forward-headers-strategy: native`), which
  auth-service trusts from any private-network address. **auth-service must only be reachable through the
  gateway** (never publish its port or open it in a security group), or a caller could pick its own IP.

### Dev admin account
- **Local:** the dev profile creates one ADMIN account at startup if no account has its email
  (`admin@levddit.local` / `admin-password`, `app.dev-admin.*`, overridable with `APP_DEVADMIN_*`), so admin
  endpoints can be tried with a real token on a fresh database. An existing account is never changed.
- **Production:** nothing to set or remove: the code only exists in the dev profile. Because the password is in the
  repo, never run the dev profile anywhere others can reach. Promote real admins in the database.

## gateway

### Sessions and the OAuth client
- The gateway keeps each browser's session, and with it the user's tokens, in Postgres (schema `gateway`), so it
  needs the same `SPRING_DATASOURCE_*` settings as the services.
- **Production:**
  - `APP_PUBLIC_URL`: the same `https://` origin as auth-service's. The login and logout redirects are built on it.
    The gateway refuses to start without it.
  - `APP_OAUTH_GATEWAY_CLIENT_SECRET`: the same value auth-service has.
  - The session cookie is HTTPS-only by default; nothing to set.
- Sessions expire after 30 minutes without a request (Spring's default). Expired rows are deleted by Spring Session
  itself.

### Admin endpoint masking
- The gateway conceals `/api/admin` and `/api/admin/**` from anonymous callers and non-admins with its normal
  `404` error response, before CSRF validation or proxying. This includes unknown paths in that namespace.
  Admins must log in through the existing login flow first.
- The gate resolves (and when necessary refreshes) the session's access token, validates its signature, issuer,
  timestamps and subject, and checks its `roles` claim. It does not use the login-time ID-token roles returned
  by `/api/me`. An admin request relays exactly the checked token to auth-service; downstream JWT checks remain.
- Access-token validation fetches public keys from `${AUTH_SERVICE_URL}/oauth2/jwks` and caches them. No new secret,
  database lookup of user roles, session store, or deployment component is required. Keep this endpoint internally
  reachable from the gateway. The current shared JWT contract does not enforce service audiences.
- A rejected refresh ends the gateway session and returns `404` on admin paths. A token refresh or key-fetch
  infrastructure failure returns `503` with `Retry-After: 5`, keeping the session for retry.
- Role changes are visible to the mask when the access token refreshes (the existing 15-minute token lifetime,
  with Spring's refresh skew), or after a full logout/login. This is not immediate role revocation. `/api/me`
  still reads the session's OIDC principal and can display old roles until a new login.
- Masked errors use `sendError(404)`, letting Boot render the same JSON/HTML as an ordinary gateway missing route,
  including the original request path. Both paths keep the existing SPA CSRF-cookie behavior and security cache
  headers (`no-store`). Do not enable error-message/exception disclosure or add admin-only response headers.
- Scope is the dedicated admin API namespace. Community admin operations still share public resource paths and
  retain their existing behavior. Services must stay private and enforce permissions independently. Masking does
  not rate-limit probes, and no artificial delay or dummy database work is added.

### One origin: who routes the gateway's paths
- The browser only ever talks to `APP_PUBLIC_URL`. Locally that's the frontend's nginx (`frontend/nginx.conf`) or
  the Vite dev server, which forward `/api/`, `/oauth2/`, `/login/oauth2/`, `/logout`, `/connect/` and
  `/.well-known/` to the gateway and serve React for everything else.
- **AWS (Fargate behind an ALB):** the load balancer does this instead, with a listener rule sending those paths to
  the gateway's target group. If React is served from S3, CloudFront is the front door: those paths go to the ALB,
  everything else to S3. nginx's proxying is never used there. Swagger's paths stay out: it is off in production.

### Trusted proxies
- **Base config:** `trusted-proxies` trusts only loopback. **Local:** the dev profile also trusts Docker's private
  ranges, because the frontend's nginx sits in front of the gateway. The gateway drops an untrusted caller's own
  `X-Forwarded-For` and sends the address it saw.
- **AWS (Fargate behind an ALB):** the gateway sees the ALB's private addresses for every request, so without this
  every user would share one login rate limit. Set `SPRING_CLOUD_GATEWAY_SERVER_WEBMVC_TRUSTEDPROXIES` to the VPC's
  CIDR (for example `10\.0\..*`). That is safe because the gateway's security group only lets the ALB in. The ALB
  appends the client's address to `X-Forwarded-For` itself.
- **With CloudFront in front of the ALB:** the ALB sees CloudFront's address, not the user's. Take the client
  address from `CloudFront-Viewer-Address` or trust CloudFront's ranges, or users behind one edge share a rate limit.
- Either way, check with a real request through the whole chain which address reaches auth-service before relying
  on it.

## Database

### Credentials
- **Local:** `docker-compose.yml` falls back to `reddit` / `reddit_local` when `.env` does not override them.
- **Production:** set a strong `POSTGRES_PASSWORD` (or the RDS credentials) through the environment. Never rely on
  the compose defaults.

### Published port
- **Local:** Postgres is published on `5432` so you can connect from the host.
- **Production:** do not publish the database port. Only the services should reach it.

## community-service and post-service

### Access tokens
- Both services check auth-service's access tokens themselves (`security-convention.md`): the signature with the
  public key from auth-service's `/oauth2/jwks`, and the `iss` claim against the public URL.
- **Local:** the dev profile falls back to `http://localhost:8081/oauth2/jwks` and `http://localhost:3000`;
  `docker-compose.yml` sets `AUTH_JWKS_URI=http://auth-service:8081/oauth2/jwks`.
- **Production:**
  - `AUTH_JWKS_URI`: auth-service's internal address plus `/oauth2/jwks`. Nothing secret. The services refuse to
    start without it.
  - `APP_PUBLIC_URL`: the same `https://` origin as auth-service's, or every token is rejected (`iss` mismatch).
    The services refuse to start without it.

## community-service

### Mock authentication
- **Local:** the dev profile sets `app.mock-auth.enabled: true`, which puts a hard-coded `ROLE_ADMIN` caller with
  user id `1` into the security context, but only for requests without an access token: a real token always wins.
  It keeps the ADMIN endpoints usable while nobody can log in through the browser yet. Startup logs a WARN while
  the mock filter is registered.
- **Production:** without the dev profile the flag is `false`. Never set `APP_MOCKAUTH_ENABLED`. Turning it on would let anyone perform ADMIN
  operations.

## post-service

### S3
- **Local:** `APP_S3_ENDPOINT=http://moto:5000` points post-service at Moto, a fake S3.
- **Production:** remove `APP_S3_ENDPOINT` so the AWS SDK uses real S3, and set `S3_BUCKET` and `AWS_REGION`
  if they differ from the defaults (`levddit-post-images`, `eu-central-1`).
- **Upload size:** `POST /api/posts` accepts up to 3 images of 5 MB each (`spring.servlet.multipart.*`, 16 MB per
  request). Any proxy in front of the gateway (load balancer, ingress, nginx) must allow request bodies of at least
  16 MB, or uploads fail there with 413 before reaching the service.

### Mock authentication
- **Local:** `docker-compose.yml` sets `APP_MOCKAUTH_ENABLED=true`, which gives every request without a token a
  made-up JWT caller: by default user id `1`, username `mockuser`, role `USER`. The optional headers
  `X-Mock-User-Id`, `X-Mock-Username` and `X-Mock-Roles` (comma-separated, e.g. `USER,ADMIN`) switch the caller per
  request, e.g. to check that editing someone else's post is rejected. A real access token always wins over the
  mock. It keeps the write endpoints usable while nobody can log in through the browser yet. Startup logs a WARN while the mock filter is registered.
- **Production:** the flag defaults to `false` in code, so leave `APP_MOCKAUTH_ENABLED` unset or `false`. Turning it on would let anyone act as any user,
  including ADMIN, by sending a header.

### Community stub
- **Local:** community-service does not have the `/internal/communities/...` endpoints yet, so
  `APP_COMMUNITYSTUB_ENABLED=true` replaces those calls with a stub: every community is active and every user is a
  member of every community. `APP_COMMUNITYSTUB_UNAVAILABLECOMMUNITYIDS` and `APP_COMMUNITYSTUB_NONMEMBERUSERIDS`
  (comma-separated ids, `999` in `docker-compose.yml`) carve out exceptions, so creating a post in community `999`
  gives 422 and creating one as user `999` (`X-Mock-User-Id: 999`) gives 403. Startup logs a WARN while the stub is
  registered.
- **Production:** leave `APP_COMMUNITYSTUB_*` unset. The flag defaults to `false`; without it and without the real
  community-service client the app fails to start instead of letting everyone post everywhere.

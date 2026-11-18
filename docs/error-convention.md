# Error convention

Every service returns errors as RFC 9457 problem details (`application/problem+json`).

## Shape

```json
{
  "type": "about:blank",
  "title": "Conflict",
  "status": 409,
  "detail": "Username is already taken",
  "instance": "/api/auth/register",
  "errorType": "USERNAME_TAKEN"
}
```

- `status`, `detail`: set by the service. `detail` is shown to users, so it never contains internals.
- `errorType`: our stable code. **Clients branch on this, never on `detail`.** Renaming a value is a breaking change.
- No `errorType` means the framework produced the error (missing or expired token, malformed JSON, unknown route).
  A 401 without `errorType` means "refresh the access token"; a 401 with `INVALID_CREDENTIALS` means "wrong login".
- Validation failures (400) add `errors`: a list of `{ "field", "message" }`.
- 500 never has a `detail`. The cause is in the service log only.

## Status by exception type

| Exception (core)        | Status |
|-------------------------|--------|
| `UnauthorizedException` | 401    |
| `ForbiddenException`    | 403    |
| `ConflictException`     | 409    |
| `TooManyRequestsException` | 429, with a `Retry-After` header in seconds (auth-service rate limits) |

Add `NotFoundException` (404) and `ValidationException` (422, well-formed but breaks a business rule) when your
service needs them: add them to `permits` in `DomainException` and the compiler shows the switch to update.

## Adding it to your service

Copy `auth-service`'s `core/exception` package and `api/GlobalExceptionHandler` into your service, change the
package names, and replace the `ErrorType` values with your own codes. Each service owns its codes.

Rules:
- Expected failures a correct client can cause → throw a `DomainException` subtype. Bugs → let them be a 500.
- Domain exceptions stay unchecked, so `@Transactional` rolls back on them.
- Errors from the security filter chain (missing or invalid token) never reach the handler. Each service's
  security config sets an `AuthenticationEntryPoint` and `AccessDeniedHandler` that write the same shape.

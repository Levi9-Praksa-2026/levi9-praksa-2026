import type { CsrfResponse, LoginRequest, MeResponse, RedirectResponse, RegisterRequest } from './contracts/auth'
import type { UserProfileResponse } from './contracts/users'
import { isApiError } from './errors'
import { http } from './http'

/*
  The login session. Real requests only: the auth flow never had a mock. "Log in" itself is a page load,
  not a call: `routes.login` (the gateway's OAuth start), which brings the browser to the sign-in page.
*/

/** `GET /api/me`: who is logged in. 401 when nobody is. */
export function getMe(): Promise<MeResponse> {
  return http<MeResponse>('/api/me')
}

/**
 * `POST /logout`: ends the gateway's session and answers where to go next. The caller must follow
 * `redirectUrl`: it ends auth-service's own login too, or the next "Log in" would skip the password.
 */
export function logout(): Promise<RedirectResponse> {
  return http<RedirectResponse>('/logout', { method: 'POST' })
}

/** `GET /api/auth/csrf`: auth-service's token for login and register (it also starts its session). */
export function getCsrf(): Promise<CsrfResponse> {
  return http<CsrfResponse>('/api/auth/csrf')
}

/**
 * Runs a login or register with a fresh auth-service token. A plain 403 means the token was missing or stale
 * (its session expired): get a new one and try once more. A banned account's 403 is a real answer.
 */
async function withAuthCsrf<T>(send: (csrf: CsrfResponse) => Promise<T>): Promise<T> {
  try {
    return await send(await getCsrf())
  } catch (error) {
    if (!isApiError(error) || error.status !== 403 || error.errorType === 'USER_BANNED') throw error
    return send(await getCsrf())
  }
}

/**
 * `POST /api/auth/login`: answers where to go next (follow it with a page load; it finishes the OAuth login).
 * 401 `INVALID_CREDENTIALS` for a wrong password and an unknown email alike; 403 `USER_BANNED` with
 * `banReason`; 429 `RATE_LIMITED` with `retryAfter`.
 */
export function login({ email, password }: LoginRequest): Promise<RedirectResponse> {
  return withAuthCsrf(csrf =>
    http<RedirectResponse>('/api/auth/login', {
      method: 'POST',
      body: new URLSearchParams({ email, password }),
      headers: { [csrf.headerName]: csrf.token },
      xsrf: false,
    }),
  )
}

/** `POST /api/auth/register`: creates the account (201), without logging in. Errors: see `RegisterRequest`. */
export function register(request: RegisterRequest): Promise<UserProfileResponse> {
  return withAuthCsrf(csrf =>
    http<UserProfileResponse>('/api/auth/register', {
      method: 'POST',
      body: request,
      headers: { [csrf.headerName]: csrf.token },
      xsrf: false,
    }),
  )
}

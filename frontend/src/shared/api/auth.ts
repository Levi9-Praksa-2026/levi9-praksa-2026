import type { MeResponse, RedirectResponse } from './contracts/auth'
import { http } from './http'

/*
  The gateway's login session. Real requests only: the auth flow never had a mock.
*/

/**
 * Where "Log in" goes: the gateway starts the OAuth login there and the browser comes back logged in.
 * A full page navigation (a plain link or `location.assign`), never `fetch`: it is a chain of redirects
 * that has to happen in the address bar.
 */
export const LOGIN_START = '/oauth2/authorization/levddit'

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

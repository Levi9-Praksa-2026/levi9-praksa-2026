/*
  The login flow through the gateway (a BFF: it keeps the tokens, the browser only has its session cookie).
  The full contract, with every status code, is in the workspace's docs/plans/frontend-auth-notes.md.
*/

/** A role from the ID token. Use it only to show or hide buttons: the services decide for real. */
export type Role = 'USER' | 'ADMIN'

/**
 * `GET /api/me` (gateway, `MeController.MeResponse`): who is logged in, from the session, as of the last
 * login. The gateway returns 204 when nobody is logged in.
 */
export interface MeResponse {
  id: number
  username: string
  roles: Role[]
}

/** Where to send the browser next: `POST /logout` and `POST /api/auth/login`. */
export interface RedirectResponse {
  redirectUrl: string
}

/**
 * `GET /api/auth/csrf`: auth-service's own CSRF token, for login and register only (every other write uses
 * the gateway's XSRF-TOKEN cookie). Send it back as the header named here.
 */
export interface CsrfResponse {
  headerName: string
  token: string
}

/** `POST /api/auth/login`: a form, not JSON. The field is `email` (Spring Security's usernameParameter). */
export interface LoginRequest {
  email: string
  password: string
}

/** The backend's limits, from `RegisterDTO.java`: used by the forms to say the rules before sending. */
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/
export const PASSWORD_MIN_LENGTH = 12
/** BCrypt reads at most 72 bytes; counted in UTF-8, so an emoji counts as 4. */
export const PASSWORD_MAX_BYTES = 72
export const NAME_MAX_LENGTH = 50
export const EMAIL_MAX_LENGTH = 254

/**
 * `POST /api/auth/register` (JSON): `RegisterDTO.java`. Answers 201 with a `UserProfileResponse`, no tokens:
 * log in afterwards. 409 `USERNAME_TAKEN`; 409 `REGISTRATION_FAILED` never says whether the email is taken.
 */
export interface RegisterRequest {
  username: string
  email: string
  password: string
  firstName: string
  lastName: string
}

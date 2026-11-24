/*
  The login flow through the gateway (a BFF: it keeps the tokens, the browser only has its session cookie).
  The full contract, with every status code, is in the workspace's docs/plans/frontend-auth-notes.md.
*/

/** A role from the ID token. Use it only to show or hide buttons: the services decide for real. */
export type Role = 'USER' | 'ADMIN'

/**
 * `GET /api/me` (gateway, `MeController.MeResponse`): who is logged in, from the session, as of the last
 * login. 401 when nobody is.
 */
export interface MeResponse {
  id: number
  username: string
  roles: Role[]
}

/** Where to send the browser next: `POST /logout`, and later `POST /api/auth/login`. */
export interface RedirectResponse {
  redirectUrl: string
}

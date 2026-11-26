/**
 * Every path in one place. `/` and everything under it is the forum (src/app, React Router);
 * `/welcome/` is a separate document (src/pages/welcome), so a link to it must reload the page.
 * Hosting: serve welcome/index.html for /welcome/ (redirect /welcome to it) and index.html for every other path.
 */
export const routes = {
  home: '/',
  /**
   * "Log in": the gateway's OAuth start, so always a full page load. It sends the browser to `signIn`
   * and, once the password is in, back here logged in.
   */
  login: '/oauth2/authorization/levddit',
  /** The sign-in form (email, then password). The backend sends the browser here; links say `login`. */
  signIn: '/signin',
  /** "Join now": the registration form. `?email=` fills in the email. */
  signUp: '/signup',
  welcome: '/welcome/',
  /** The searchable community directory. */
  communities: '/communities',
  /** Administrator overview. */
  admin: '/admin',
  adminCommunities: '/admin/communities',
  adminUsers: '/admin/users',
  adminPosts: '/admin/posts',
  /** A community's page: `/l/frontend`. */
  community: (name: string) => `/l/${encodeURIComponent(name)}`,
} as const

/** The route pattern for `routes.community`, for the router. */
export const COMMUNITY_PATTERN = '/l/:name'

/** Paths that leave the forum app and load another document (or a chain of redirects). */
export const externalDocuments: readonly string[] = [routes.welcome, routes.login]

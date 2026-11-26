/**
 * Every path in one place. `/` and everything under it is the forum (src/app, React Router);
 * `/welcome/` is a separate document (src/pages/welcome), so a link to it must reload the page.
 * Hosting: serve welcome/index.html for /welcome/ (redirect /welcome to it) and index.html for every other path.
 */
const communitiesPath = '/communities'

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
  
  /** Administrator overview. */
  admin: '/admin',
  adminCommunities: '/admin/communities',
  adminUsers: '/admin/users',
  adminPosts: '/admin/posts',

  /** The searchable community directory. */
  communities: communitiesPath,
  /** Where the header search lands: the directory filtered by a (trimmed) name, or all of it if empty. */
  communitiesSearch: (name: string) => {
    const q = name.trim()
    return q ? `${communitiesPath}?q=${encodeURIComponent(q)}` : communitiesPath
  },
  /** A community's page: `/l/frontend`. */
  community: (name: string) => `/l/${encodeURIComponent(name)}`,
  /** The logged-in user's own profile. */
  profile: '/profile',
  /** A new post in a community: `/l/frontend/submit`. */
  submit: (communityName: string) => `/l/${encodeURIComponent(communityName)}/submit`,
  /** A post with its comments: `/posts/42`. `#comments` jumps to the comments. */
  post: (id: number) => `/posts/${id}`,
} as const

/** The route pattern for `routes.community`, for the router. */
export const COMMUNITY_PATTERN = '/l/:name'
/** The route pattern for `routes.post`, for the router. */
export const POST_PATTERN = '/posts/:id'
/** The route pattern for `routes.submit`, for the router. */
export const SUBMIT_PATTERN = '/l/:name/submit'

/** Paths that leave the forum app and load another document (or a chain of redirects). */
export const externalDocuments: readonly string[] = [routes.welcome, routes.login]

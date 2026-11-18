/**
 * Every path in one place. `/` and everything under it is the forum (src/app, React Router);
 * `/welcome/` is a separate document (src/pages/welcome), so a link to it must reload the page.
 * Hosting: serve welcome/index.html for /welcome/ (redirect /welcome to it) and index.html for every other path.
 */
export const routes = {
  home: '/',
  login: '/login',
  register: '/register',
  welcome: '/welcome/',
} as const

/** Paths that leave the forum app and load another document. */
export const externalDocuments: readonly string[] = [routes.welcome]

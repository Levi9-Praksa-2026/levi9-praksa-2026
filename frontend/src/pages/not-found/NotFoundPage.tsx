import { routes } from '@/shared/config/routes'
import { AppLink } from '@/shared/ui/Link'

/** Any path the forum does not know yet. */
export function NotFoundPage() {
  return (
    <main className="app-shell">
      <p className="app-shell__brand">Levddit</p>
      <h1>This page does not exist</h1>
      <p className="app-shell__note">The link may be old, or the page has not been built yet.</p>
      <p className="app-shell__links">
        <AppLink href={routes.home}>Go to the front page</AppLink>
      </p>
    </main>
  )
}

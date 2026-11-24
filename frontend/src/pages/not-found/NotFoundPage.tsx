import { routes } from '@/shared/config/routes'
import { AppLink } from '@/shared/ui/Link'

/** Any path the forum does not know yet. Renders inside the forum frame (and alone as the router's error page). */
export function NotFoundPage() {
  return (
    <div className="rounded-lg border border-line bg-bg px-card-pad py-10 text-center">
      <h1 className="text-h3">This page does not exist</h1>
      <p className="mt-2 text-small text-muted">The link may be old, or the page has not been built yet.</p>
      <AppLink href={routes.home} className="mt-4 inline-block text-small font-medium text-accent underline underline-offset-2">
        Go to the front page
      </AppLink>
    </div>
  )
}

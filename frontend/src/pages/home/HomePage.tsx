import { routes } from '@/shared/config/routes'
import { ButtonRow } from '@/shared/ui/Button'
import { AppLink } from '@/shared/ui/Link'

/** `/`: the forum's front page. The feed and the l/ communities replace this placeholder. */
export function HomePage() {
  return (
    <main className="app-shell">
      <p className="app-shell__brand">Levddit</p>
      <h1>The forum is on its way</h1>
      <p className="app-shell__note">This is where the feed and the l/ communities will live.</p>
      <ButtonRow primary={{ label: 'Join now', href: routes.register }} secondary={{ label: 'Log in', href: routes.login }} />
      <p className="app-shell__links">
        <AppLink href={routes.welcome}>What is Levddit?</AppLink>
      </p>
    </main>
  )
}

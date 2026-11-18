import { routes } from '@/shared/config/routes'
import { AppLink } from '@/shared/ui/Link'

export type AuthMode = 'login' | 'register'

const COPY: Record<AuthMode, { title: string; other: string; otherLabel: string }> = {
  login: { title: 'Log in to Levddit', other: routes.register, otherLabel: 'Register instead' },
  register: { title: 'Register for Levddit', other: routes.login, otherLabel: 'Log in instead' },
}

/** `/login` and `/register`. Placeholder until accounts are connected. */
export function AuthPage({ mode }: { mode: AuthMode }) {
  const copy = COPY[mode]
  return (
    <main className="app-shell">
      <p className="app-shell__brand">Levddit</p>
      <h1>{copy.title}</h1>
      <p className="app-shell__note">This screen is a placeholder. Accounts are not connected yet.</p>
      <p className="app-shell__links">
        <AppLink href={copy.other}>{copy.otherLabel}</AppLink>
        <AppLink href={routes.welcome}>Back to the welcome page</AppLink>
      </p>
    </main>
  )
}

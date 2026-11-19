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
    <main className="mx-auto grid max-w-[480px] gap-4 px-6 py-24">
      <p className="font-semibold text-accent">Levddit</p>
      <h1 className="text-[32px] leading-10">{copy.title}</h1>
      <p className="text-muted">This screen is a placeholder. Accounts are not connected yet.</p>
      <p className="flex flex-wrap gap-6 [&_a]:text-accent [&_a]:underline-offset-[3px]">
        <AppLink href={copy.other}>{copy.otherLabel}</AppLink>
        <AppLink href={routes.welcome}>Back to the welcome page</AppLink>
      </p>
    </main>
  )
}

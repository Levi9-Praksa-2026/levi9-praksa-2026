import { routes } from '@/shared/config/routes'
import { ButtonRow } from '@/shared/ui/Button'
import { AppLink } from '@/shared/ui/Link'

/** `/`: the forum's front page. The feed and the l/ communities replace this placeholder. */
export function HomePage() {
  return (
    <main className="mx-auto grid max-w-[480px] gap-4 px-6 py-24">
      <p className="font-semibold text-accent">Levddit</p>
      <h1 className="text-[32px] leading-10">The forum is on its way</h1>
      <p className="text-muted">This is where the feed and the l/ communities will live.</p>
      <ButtonRow primary={{ label: 'Join now', href: routes.register }} secondary={{ label: 'Log in', href: routes.login }} />
      <p className="flex flex-wrap gap-6 [&_a]:text-accent [&_a]:underline-offset-[3px]">
        <AppLink href={routes.welcome}>What is Levddit?</AppLink>
      </p>
    </main>
  )
}

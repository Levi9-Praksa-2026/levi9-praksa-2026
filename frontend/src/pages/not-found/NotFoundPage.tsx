import { routes } from '@/shared/config/routes'
import { AppLink } from '@/shared/ui/Link'

/** Any path the forum does not know yet. */
export function NotFoundPage() {
  return (
    <main className="mx-auto grid max-w-[480px] gap-4 px-6 py-24">
      <p className="font-semibold text-accent">Levddit</p>
      <h1 className="text-[32px] leading-10">This page does not exist</h1>
      <p className="text-muted">The link may be old, or the page has not been built yet.</p>
      <p className="flex flex-wrap gap-6 [&_a]:text-accent [&_a]:underline-offset-[3px]">
        <AppLink href={routes.home}>Go to the front page</AppLink>
      </p>
    </main>
  )
}

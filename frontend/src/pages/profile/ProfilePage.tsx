import { ProfileOverview } from '@/features/profile/ProfileOverview'
import { useProfileOverview } from '@/features/profile/useProfileOverview'
import { isApiError } from '@/shared/api/errors'
import { routes } from '@/shared/config/routes'
import { Button } from '@/shared/ui/Button'

/** `/profile`: the logged-in user's Overview tab. */
export function ProfilePage() {
  const { data, error, isPending, refetch } = useProfileOverview()

  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Loading profile" className="grid gap-card-gap">
        <div className="flex items-center gap-4 rounded-lg border border-line bg-bg p-card-pad">
          <span className="size-14 flex-none animate-pulse rounded-full bg-surface" />
          <span className="grid flex-1 gap-2">
            <span className="h-6 w-40 animate-pulse rounded-sm bg-surface" />
            <span className="h-3 w-56 max-w-full animate-pulse rounded-sm bg-surface" />
          </span>
        </div>
        <div className="h-10 w-24 animate-pulse rounded-btn bg-surface" />
        <div className="h-32 animate-pulse rounded-lg bg-surface" />
      </div>
    )
  }

  if (error) {
    const loggedOut = isApiError(error) && error.status === 401
    return (
      <div className="rounded-lg border border-line bg-bg px-card-pad py-10 text-center">
        <h1 className="text-h3">{loggedOut ? 'Log in to see your profile' : "Couldn't load your profile"}</h1>
        <p className="mt-2 text-small text-muted">
          {loggedOut ? 'Your profile lives with your account.' : 'Check your connection and try again.'}
        </p>
        {loggedOut ? (
          <Button href={routes.login} className="mt-4">Log in</Button>
        ) : (
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 cursor-pointer text-small font-medium text-accent underline underline-offset-2"
          >
            Try again
          </button>
        )}
      </div>
    )
  }

  if (!data) return null
  return <ProfileOverview profile={data} />
}

import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { UserAvatar } from '@/features/users/UserAvatar'
import { isApiError } from '@/shared/api/errors'
import { getPublicUserProfile } from '@/shared/api/profile'
import { queryKeys } from '@/shared/api/queryKeys'
import { routes } from '@/shared/config/routes'

/** A public identity, available to visitors as well as logged-in users. */
export function PublicProfilePage() {
  const { username = '' } = useParams()
  const { data, error, isPending, refetch } = useQuery({
    queryKey: queryKeys.profile.public(username),
    queryFn: () => getPublicUserProfile(username),
  })

  if (isPending) return <div aria-busy="true" aria-label="Loading profile" className="h-28 animate-pulse rounded-lg bg-surface" />
  if (error) {
    const gone = isApiError(error) && error.status === 404
    return (
      <div className="rounded-lg border border-line bg-bg px-card-pad py-10 text-center">
        <h1 className="text-h3">{gone ? 'This user is unavailable' : "Couldn't load this profile"}</h1>
        {gone ? <Link to={routes.home} className="mt-4 inline-block text-small text-accent underline">Back to Home</Link> : (
          <button type="button" onClick={() => void refetch()} className="mt-4 cursor-pointer text-small text-accent underline">Try again</button>
        )}
      </div>
    )
  }
  return (
    <header className="flex items-center gap-4 rounded-lg border border-line bg-bg p-card-pad">
      <UserAvatar username={data.username} className="size-14 text-lead" />
      <div className="min-w-0">
        <h1 className="text-h3 break-words">{data.firstName} {data.lastName}</h1>
        <p className="mt-1 break-words text-small text-muted">u/{data.username}</p>
      </div>
    </header>
  )
}

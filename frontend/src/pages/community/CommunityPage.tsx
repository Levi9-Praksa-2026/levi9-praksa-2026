import { useParams } from 'react-router'
import { CommunityAvatar } from '@/features/communities/CommunityAvatar'
import { useCommunity } from '@/features/communities/hooks'
import { isApiError } from '@/shared/api/errors'

/** `/l/:name`: a community's page. For now its header only; its posts come with the feed. */
export function CommunityPage() {
  const { name = '' } = useParams()
  const { data, error, isPending, refetch } = useCommunity(name)

  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Loading community" className="flex items-center gap-4 rounded-lg border border-line bg-bg p-card-pad">
        <span className="size-12 animate-pulse rounded-full bg-surface" />
        <span className="grid flex-1 gap-2">
          <span className="h-5 w-40 animate-pulse rounded-sm bg-surface" />
          <span className="h-3 w-64 max-w-full animate-pulse rounded-sm bg-surface" />
        </span>
      </div>
    )
  }

  if (error) {
    const missing = isApiError(error) && error.status === 404
    return (
      <div className="rounded-lg border border-line bg-bg px-card-pad py-10 text-center">
        <h1 className="text-h3">{missing ? `l/${name} doesn't exist` : `Couldn't load l/${name}`}</h1>
        <p className="mt-2 text-small text-muted">
          {missing ? 'It may have been shut down, or the link is mistyped.' : 'Check your connection and try again.'}
        </p>
        {!missing && (
          <button type="button" onClick={() => void refetch()} className="mt-4 cursor-pointer text-small font-medium text-accent underline underline-offset-2">
            Try again
          </button>
        )}
      </div>
    )
  }

  if (!data) return null
  return (
    <section aria-labelledby="community-title" className="grid gap-4">
      <header className="flex items-center gap-4 rounded-lg border border-line bg-bg p-card-pad">
        <CommunityAvatar name={data.name} size="md" />
        <div className="min-w-0">
          <h1 id="community-title" className="truncate text-h3">l/{data.name}</h1>
          {data.description && <p className="mt-1 text-small text-muted">{data.description}</p>}
          <p className="mt-1 text-label text-muted">{data.memberCount} member{data.memberCount === 1 ? '' : 's'}</p>
        </div>
      </header>
      <div className="rounded-lg border border-line bg-bg px-card-pad py-10 text-center">
        <p className="text-small text-muted">Posts in l/{data.name} will show here.</p>
      </div>
    </section>
  )
}

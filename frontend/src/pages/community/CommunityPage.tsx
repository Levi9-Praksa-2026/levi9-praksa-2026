import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { CommunityAvatar } from '@/features/communities/CommunityAvatar'
import { CommunityHeader } from '@/features/communities/CommunityHeader'
import { InactiveCommunityNotice } from '@/features/communities/InactiveCommunityNotice'
import { useCommunity, useInactiveCommunity } from '@/features/communities/hooks'
import { PostFeed } from '@/features/posts/PostFeed'
import { useCurrentUser } from '@/features/users/useCurrentUser'
import { reactivateCommunity } from '@/shared/api/communities'
import { isApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/queryKeys'
import { routes } from '@/shared/config/routes'

/** `/l/:name`: the community's header, its Posts tab, and the posts written in it. */
export function CommunityPage() {
  const { name = '' } = useParams()
  const { user } = useCurrentUser()
  const isAdmin = user?.roles.includes('ADMIN') ?? false
  const { data, error, isPending, refetch } = useCommunity(name)
  const missing = isApiError(error) && error.status === 404
  const inactive = useInactiveCommunity(name, missing && isAdmin)
  const client = useQueryClient()
  // Keyed by name, so navigating to another community never inherits this page's shut-down state.
  const [shutDownName, setShutDownName] = useState<string | null>(null)
  const shutDown = shutDownName === name

  const reactivate = useMutation({
    mutationFn: () => reactivateCommunity(name),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.communities.all })
      setShutDownName(null)
      // The detail endpoint will answer again now that the community is active.
      void refetch()
    },
  })

  const loading = (
    <div aria-busy="true" aria-label="Loading community" className="flex items-center gap-4 rounded-lg border border-line bg-bg p-card-pad">
      <span className="size-12 animate-pulse rounded-full bg-surface" />
      <span className="grid flex-1 gap-2">
        <span className="h-5 w-40 animate-pulse rounded-sm bg-surface" />
        <span className="h-3 w-64 max-w-full animate-pulse rounded-sm bg-surface" />
      </span>
    </div>
  )

  const reactivateError = reactivate.isError ? `Couldn't reactivate l/${name}. Try again.` : null

  if (isPending || user === undefined || (missing && isAdmin && inactive.isPending) || reactivate.isPending) return loading

  // An admin who just deactivated this community stays on the page, with a way to undo it.
  if (shutDown && data) {
    return (
      <section aria-labelledby="community-title" className="grid gap-card-gap">
        <CommunityHeader community={data} shutDown />
        <InactiveCommunityNotice name={data.name} onReactivate={() => reactivate.mutate()} pending={reactivate.isPending} error={reactivateError} />
        <Link to={routes.communities} className="w-fit text-small font-medium text-accent underline underline-offset-2">Back to communities</Link>
      </section>
    )
  }

  // A normal visitor gets a 404; an admin can also be looking at a shut-down community, which the
  // public detail endpoint never returns, so it is looked up through the admin list instead.
  if (missing && isAdmin && inactive.data) {
    const community = inactive.data
    return (
      <section aria-labelledby="community-title" className="grid gap-card-gap">
        <header className="flex items-center gap-4 rounded-lg border border-line bg-bg p-card-pad">
          <CommunityAvatar name={community.name} size="md" />
          <div className="min-w-0 flex-1">
            <h1 id="community-title" className="truncate text-h3">l/{community.name}</h1>
            <p className="mt-1 text-label text-muted">
              {community.memberCount} member{community.memberCount === 1 ? '' : 's'} · Shut down
            </p>
          </div>
        </header>
        <InactiveCommunityNotice name={community.name} onReactivate={() => reactivate.mutate()} pending={reactivate.isPending} error={reactivateError} />
        <Link to={routes.communities} className="w-fit text-small font-medium text-accent underline underline-offset-2">Back to communities</Link>
      </section>
    )
  }

  if (error) {
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
    <section aria-labelledby="community-title" className="grid gap-card-gap">
      <CommunityHeader community={data} onDeactivated={() => setShutDownName(name)} />
      <nav aria-label="Community sections">
        <span aria-current="page" className="inline-flex h-btn items-center rounded-btn bg-surface px-4 text-small font-semibold text-ink">
          Posts
        </span>
      </nav>
      <section aria-labelledby="community-posts-title">
        <h2 id="community-posts-title" className="text-lead font-semibold">Posts</h2>
        <div className="mt-2">
          <PostFeed
            communityId={data.id}
            hideCommunity
            label={`Posts in l/${data.name}`}
            emptyText={`No posts in l/${data.name} yet.`}
          />
        </div>
      </section>
    </section>
  )
}

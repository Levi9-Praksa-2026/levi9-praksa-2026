import { Compass, RefreshCw, ShieldCheck } from 'lucide-react'
import { useCommunityDirectory } from '@/features/communities/hooks'
import { CommunityAvatar } from '@/features/communities/CommunityAvatar'
import { routes } from '@/shared/config/routes'
import { Button } from '@/shared/ui/Button'
import { AppLink } from '@/shared/ui/Link'
import { Notice } from '@/shared/ui/Notice'

export function AdminDashboardPage() {
  const active = useCommunityDirectory({ sort: 'top', page: 0, size: 5 })
  const inactive = useCommunityDirectory({ inactive: true, page: 0, size: 1 })
  const refreshing = active.isFetching || inactive.isFetching

  return (
    <section aria-labelledby="admin-title" className="grid gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-small font-medium text-accent"><ShieldCheck className="size-4" aria-hidden="true" /> Administration</p>
          <h1 id="admin-title" className="text-h2">Admin dashboard</h1>
          <p className="mt-1 text-small text-muted">A pulse on your communities, all in one place.</p>
        </div>
        <Button variant="secondary" disabled={refreshing} onClick={() => { void active.refetch(); void inactive.refetch() }}>
          <RefreshCw className="size-4" aria-hidden="true" />{refreshing ? 'Refreshing…' : 'Refresh data'}
        </Button>
      </header>

      {(active.isError || inactive.isError) && <Notice tone="error">Some community data couldn't be loaded. Refresh data to try again.</Notice>}

      <div className="grid gap-4 sm:grid-cols-2">
        <CommunityStat title="Active communities" value={active.isError ? undefined : active.data?.totalElements} loading={active.isPending} description="Open for conversations and new members." href={`${routes.adminCommunities}?status=active`} />
        <CommunityStat title="Inactive communities" value={inactive.isError ? undefined : inactive.data?.totalElements} loading={inactive.isPending} description="Shut down and hidden from the public directory." href={`${routes.adminCommunities}?status=inactive`} />
      </div>

      <section aria-labelledby="top-communities-title" className="overflow-hidden rounded-lg border border-line bg-bg">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-card-pad">
          <div>
            <h2 id="top-communities-title" className="text-h3">Most joined communities</h2>
            <p className="mt-1 text-small text-muted">Your top five active communities by membership.</p>
          </div>
          <AppLink href={`${routes.adminCommunities}?sort=top`} className="text-small font-medium text-accent underline underline-offset-4">View all</AppLink>
        </header>
        {active.isPending ? (
          <p role="status" className="p-card-pad text-small text-muted">Loading communities…</p>
        ) : active.isError ? (
          <p className="p-card-pad text-small text-muted">Community rankings are currently unavailable.</p>
        ) : active.data?.content.length === 0 ? (
          <p className="p-card-pad text-small text-muted">No active communities yet. Communities will appear here when they're available.</p>
        ) : (
          <ul className="divide-y divide-line">
            {active.data?.content.map(community => (
              <li key={community.name}>
                <AppLink href={`${routes.adminCommunities}?q=${encodeURIComponent(community.name)}`} className="flex min-w-0 items-center gap-3 p-card-pad hover:bg-surface">
                  <CommunityAvatar name={community.name} />
                  <span className="min-w-0 flex-1 truncate text-small font-medium">l/{community.name}</span>
                  <span className="flex-none text-small text-muted"><span className="font-mono text-ink">{community.memberCount.toLocaleString()}</span> {community.memberCount === 1 ? 'member' : 'members'}</span>
                </AppLink>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="flex items-start gap-3 rounded-lg border border-line bg-surface p-card-pad">
        <Compass className="mt-1 size-5 flex-none text-accent" aria-hidden="true" />
        <div>
          <h2 className="text-h3">Manage your platform</h2>
          <p className="mt-2 text-small text-muted">Create and manage communities, moderate user access, and review posts from across the platform.</p>
          <AppLink href={routes.adminCommunities} className="mt-3 inline-block text-small font-medium text-accent underline underline-offset-4">Manage communities</AppLink>
          <div className="mt-3 flex flex-wrap gap-3"><Button href={routes.adminUsers} variant="secondary">Moderate users</Button><Button href={routes.adminPosts} variant="secondary">Review posts</Button></div>
        </div>
      </aside>
    </section>
  )
}

function CommunityStat({ title, value, loading, description, href }: { title: string; value: number | undefined; loading: boolean; description: string; href: string }) {
  return (
    <AppLink href={href} className="grid gap-3 rounded-lg border border-line bg-bg p-card-pad hover:border-line-strong">
      <h2 className="text-small font-medium text-muted">{title}</h2>
      <p className="font-mono text-h2" aria-label={loading ? 'Loading count' : value === undefined ? 'Count unavailable' : undefined}>{loading ? '…' : value?.toLocaleString() ?? '—'}</p>
      <p className="text-small text-muted">{description}</p>
      <span className="text-small font-medium text-accent">View communities →</span>
    </AppLink>
  )
}

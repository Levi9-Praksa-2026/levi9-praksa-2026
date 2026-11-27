import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router'
import { useCurrentUser } from '@/features/users/useCurrentUser'
import { ChevronDown, Compass, Home, ChevronLeft, ChevronRight, X, ShieldCheck } from 'lucide-react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { CommunityResponse } from '@/shared/api/contracts/communities'
import { CommunityAvatar } from '@/features/communities/CommunityAvatar'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'

export interface SidebarProps {
  id: string
  /** Desktop: open beside the page, or collapsed to a rail of icons. */
  variant: 'open' | 'rail' | 'drawer'
  /** Show "My communities" (logged in, and the backend can list them). */
  showMyCommunities: boolean
  communities: Pick<UseQueryResult<CommunityResponse[]>, 'data' | 'error' | 'isLoading' | 'refetch'>
  /** Desktop: collapse or expand. Drawer: close. */
  onToggle: () => void
}

/** One row: an icon and a label. In the rail only the icon shows, and the label stays for screen readers. */
function SidebarLink({ to, icon, label, rail, end }: { to: string; icon: ReactNode; label: string; rail: boolean; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={rail ? label : undefined}
      className={cn(
        'transition-[padding,gap] duration-240 ease-in-out motion-reduce:transition-none flex min-h-10 items-center gap-3 rounded-sm px-3 text-small font-medium text-muted hover:bg-surface hover:text-ink',
        'aria-[current=page]:bg-surface aria-[current=page]:text-ink',
        rail && 'gap-0 px-[10px]',
      )}
    >
      {icon}
      <span className={cn('truncate transition-[max-width,opacity] duration-240 ease-in-out motion-reduce:transition-none', rail ? 'max-w-0 opacity-0' : 'max-w-sidebar opacity-100')}>{label}</span>
    </NavLink>
  )
}

/** The forum's sidebar: Home and the communities you joined. */
export function Sidebar({ id, variant, showMyCommunities, communities, onToggle }: SidebarProps) {
  const { user } = useCurrentUser()
  const rail = variant === 'rail'
  const [mineOpen, setMineOpen] = useState(true)
  const listId = `${id}-mine`

  return (
    <div className="relative h-full">
      <button
        type="button"
        className={cn(
          'absolute z-10 grid cursor-pointer place-items-center text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          variant === 'drawer'
            ? 'top-3 right-3 size-10 rounded-btn'
            : 'top-3 left-full -ml-px h-10 w-7 rounded-r-md border border-line bg-bg shadow-sm',
        )}
        aria-label={variant === 'drawer' ? 'Close menu' : rail ? 'Expand sidebar' : 'Collapse sidebar'}
        title={variant === 'drawer' ? 'Close menu' : rail ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={variant === 'drawer' ? true : !rail}
        aria-controls={variant === 'drawer' ? undefined : id}
        onClick={onToggle}
      >
        {variant === 'drawer' ? <X className="size-5" aria-hidden="true" />
          : rail ? <ChevronRight className="size-4" aria-hidden="true" />
          : <ChevronLeft className="size-4" aria-hidden="true" />}
      </button>
      <nav id={id} aria-label="Forum" className={cn('flex h-full flex-col overflow-y-auto', variant === 'drawer' ? 'pt-16' : 'pt-3')}>
        <div className="flex flex-col gap-0.5 px-3 pt-1">
          <SidebarLink to={routes.home} end rail={rail} label="Home" icon={<Home className="size-5 flex-none" aria-hidden="true" />} />
          <SidebarLink to={routes.communities} rail={rail} label="Discover" icon={<Compass className="size-5 flex-none" aria-hidden="true" />} />
          <SidebarLink to={routes.communities} rail={rail} label="Communities" icon={<Compass className="size-5 flex-none" aria-hidden="true" />} />
          {user?.roles.includes('ADMIN') && <SidebarLink to={routes.admin} rail={rail} label="Admin dashboard" icon={<ShieldCheck className="size-5 flex-none" aria-hidden="true" />} />}
        </div>

        {showMyCommunities && (
          <section className="mt-3 border-t border-line px-3 pt-3" aria-labelledby={rail ? undefined : `${listId}-title`} aria-label={rail ? 'My communities' : undefined}>
            {!rail && (
              <h2 id={`${listId}-title`} className="text-label">
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between rounded-sm px-3 py-2 font-text text-label font-semibold tracking-[0.08em] text-muted uppercase hover:text-ink"
                  aria-expanded={mineOpen}
                  aria-controls={listId}
                  onClick={() => setMineOpen(o => !o)}
                >
                  My communities
                  <ChevronDown className={cn('size-4 transition-transform duration-150', !mineOpen && '-rotate-90')} aria-hidden="true" />
                </button>
              </h2>
            )}
            <div id={listId} hidden={!rail && !mineOpen} className="flex flex-col gap-0.5">
              {communities.isLoading && <CommunitySkeleton rail={rail} />}
              {!communities.isLoading && communities.error != null && (
                rail ? null : (
                  <p className="px-3 py-2 text-small text-muted">
                    Couldn't load your communities.{' '}
                    <button type="button" className="cursor-pointer font-medium text-accent underline underline-offset-2" onClick={() => void communities.refetch()}>Try again</button>
                  </p>
                )
              )}
              {!communities.isLoading && communities.error == null && communities.data?.length === 0 && !rail && (
                <p className="px-3 py-2 text-small text-muted">You haven't joined any communities yet.</p>
              )}
              {communities.data?.map(c => (
                <SidebarLink key={c.name} to={routes.community(c.name)} rail={rail} label={`l/${c.name}`} icon={<CommunityAvatar name={c.name} />} />
              ))}
            </div>
          </section>
        )}
      </nav>
    </div>
  )
}

const SKELETON_WIDTHS = ['max-w-[60%]', 'max-w-[72%]', 'max-w-[84%]']

/** Three grey rows while the communities load. */
function CommunitySkeleton({ rail }: { rail: boolean }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-0.5">
      {[0, 1, 2].map(i => (
        <div key={i} className={cn('transition-[padding,gap] duration-240 ease-in-out motion-reduce:transition-none flex min-h-10 items-center gap-3 px-3', rail && 'gap-0 px-[10px]')}>
          <span className="size-7 flex-none animate-pulse rounded-full bg-surface" />
          {!rail && <span className={cn('h-3 flex-1 animate-pulse rounded-sm bg-surface', SKELETON_WIDTHS[i])} />}
        </div>
      ))}
    </div>
  )
}

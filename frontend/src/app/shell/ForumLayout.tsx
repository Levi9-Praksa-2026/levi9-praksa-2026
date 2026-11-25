import { useEffect, useId, useRef } from 'react'
import { Outlet } from 'react-router'
import { Menu } from 'lucide-react'
import { useMyCommunities } from '@/features/communities/hooks'
import { useCurrentUser } from '@/features/users/useCurrentUser'
import { cn } from '@/shared/lib/cn'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useSidebar } from './useSidebar'

/**
 * "My communities" waits for the backend: community-service can't list the caller's memberships yet (a contract
 * gap, `member=me`). Until it can, the mock would show demo_user's list to whoever is really logged in, so the
 * section stays hidden. Turn this on when the endpoint exists.
 */
const MY_COMMUNITIES_READY = false

/**
 * The frame of every forum screen: the top bar, the sidebar (beside the page from 1024px, a drawer
 * under it) and the page column. Login and register render outside it.
 */
export function ForumLayout() {
  const sidebarId = useId()
  const { user } = useCurrentUser()
  const communities = useMyCommunities(MY_COMMUNITIES_READY && user ? user.id : null)
  const { desktop, expanded, toggleExpanded, drawerOpen, setDrawerOpen } = useSidebar()
  const drawerRef = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)

  // the drawer is a modal: focus goes into it, and back to the menu button when it closes
  useEffect(() => {
    if (drawerOpen) drawerRef.current?.querySelector<HTMLElement>('button, a')?.focus()
    else if (wasOpen.current) document.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(sidebarId)}"]`)?.focus()
    wasOpen.current = drawerOpen
  }, [drawerOpen, sidebarId])

  const sidebar = (variant: 'open' | 'rail' | 'drawer') => (
    <Sidebar
      id={sidebarId}
      variant={variant}
      showMyCommunities={MY_COMMUNITIES_READY && !!user}
      communities={communities}
      onToggle={variant === 'drawer' ? () => setDrawerOpen(false) : toggleExpanded}
    />
  )

  return (
    <div className="min-h-svh bg-canvas">
      <div inert={drawerOpen}>
        <TopBar user={user} drawerOpen={drawerOpen} drawerId={sidebarId} onOpenDrawer={() => setDrawerOpen(true)} sidebar={expanded ? 'open' : 'rail'} />
      </div>

      {desktop && (
        <aside className={cn('transition-[width] duration-240 ease-in-out motion-reduce:transition-none fixed top-app-bar bottom-0 left-0 z-30 border-r border-line bg-bg', expanded ? 'w-sidebar' : 'w-rail')}>
          <button
            type="button"
            className="absolute right-0 bottom-8 z-10 grid size-8 translate-x-1/2 cursor-pointer place-items-center rounded-full border border-line-strong bg-bg text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={expanded}
            aria-controls={sidebarId}
            onClick={toggleExpanded}
          >
            <Menu className="size-4" aria-hidden="true" />
          </button>
          {sidebar(expanded ? 'open' : 'rail')}
        </aside>
      )}

      {!desktop && (
        <div
          className={cn(
            'fixed inset-0 z-50 transition-[visibility] duration-240 motion-reduce:transition-none',
            drawerOpen ? 'visible' : 'invisible pointer-events-none',
          )}
          role="dialog"
          aria-modal={drawerOpen ? true : undefined}
          aria-hidden={!drawerOpen}
          aria-label="Menu"
          inert={!drawerOpen}
        >
          <div className={cn('absolute inset-0 bg-[rgb(20_24_51/0.4)] transition-opacity duration-240 ease-in-out motion-reduce:transition-none', drawerOpen ? 'opacity-100' : 'opacity-0')} onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div ref={drawerRef} className={cn('absolute inset-y-0 left-0 w-sidebar max-w-[85vw] border-r border-line bg-bg shadow-[8px_0_32px_-16px_rgb(20_24_51/0.3)] transition-transform duration-240 ease-in-out motion-reduce:transition-none', drawerOpen ? 'translate-x-0' : '-translate-x-full')}>
            {sidebar('drawer')}
          </div>
        </div>
      )}

      <main
        id="content"
        tabIndex={-1}
        inert={drawerOpen}
        className={cn('transition-[padding-left] duration-240 ease-in-out motion-reduce:transition-none pt-app-bar outline-none', desktop && (expanded ? 'pl-sidebar' : 'pl-rail'))}
      >
        <div className="mx-auto max-w-feed px-4 py-6 sm:px-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

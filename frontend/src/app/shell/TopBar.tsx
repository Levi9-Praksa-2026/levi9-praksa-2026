import { Menu } from 'lucide-react'
import type { MeResponse } from '@/shared/api/contracts/auth'
import { routes } from '@/shared/config/routes'
import { Brand } from '@/shared/ui/Brand'
import { Button } from '@/shared/ui/Button'
import { cn } from '@/shared/lib/cn'
import { AccountMenu } from './AccountMenu'
import { CommunitySearch } from './CommunitySearch'

export interface TopBarProps {
  /** Logged in, logged out (null), or still asking (undefined: the account area stays empty). */
  user: MeResponse | null | undefined
  /** Under 1024px: the button that opens the sidebar drawer. */
  drawerOpen: boolean
  drawerId: string
  onOpenDrawer: () => void
  /** Desktop: the sidebar is open or a rail. The search centres over the page column beside it. */
  sidebar: 'open' | 'rail'
}

/** The forum's fixed top bar: the menu (small screens), the brand, the community search and the account. */
export function TopBar({ user, drawerOpen, drawerId, onOpenDrawer, sidebar }: TopBarProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 h-app-bar border-b border-line bg-bg">
      {/* From 1024px the brand and the account sit at the edges, and the search is centred over the page column
          (the same space the page uses beside the sidebar), with room kept for the account on both sides. */}
      <div className="grid h-full grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[56px_48px] items-center gap-x-2 px-3 sm:flex sm:gap-4 sm:px-4 lg:relative lg:px-0">
        <a
          href="#content"
          className="absolute top-2 left-2 z-50 -translate-y-[200%] rounded-btn border border-line-strong bg-bg px-4 py-2 text-small font-medium text-ink focus:translate-y-0"
        >
          Skip to content
        </a>
        <button
          type="button"
          className="grid size-10 flex-none cursor-pointer place-items-center rounded-btn text-ink hover:bg-surface lg:hidden"
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          aria-controls={drawerId}
          onClick={onOpenDrawer}
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <Brand
          name="Levddit"
          href={routes.home}
          mark={<img className="size-7 rounded-sm" src="/brand/levi9-mark.png" alt="" width={28} height={28} />}
          className="lg:absolute lg:top-1/2 lg:left-4 lg:-translate-y-1/2"
        />
        <div className={cn('order-last col-span-full flex min-w-0 self-start pb-2 sm:order-none sm:flex-1 sm:self-auto sm:pb-0 sm:justify-center lg:px-52', sidebar === 'open' ? 'lg:ml-sidebar' : 'lg:ml-rail')}>
          <CommunitySearch className="w-full max-w-[560px]" />
        </div>
        <div className="ml-auto flex flex-none items-center gap-2 lg:absolute lg:top-1/2 lg:right-4 lg:-translate-y-1/2">
          {user === null && (
            <>
              {/* a plain link on purpose: the login is a chain of redirects through the gateway, a full page load */}
              <a href={routes.login} className="inline-flex rounded-btn px-3 py-2 text-small font-medium text-accent hover:bg-surface">
                Log in
              </a>
              <Button href={routes.signUp} size="md" className="h-10 px-4 text-small">Join now</Button>
            </>
          )}
          {user && <AccountMenu user={user} />}
        </div>
      </div>
    </header>
  )
}

import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Loader2, LogOut, User } from 'lucide-react'
import { logout } from '@/shared/api/auth'
import type { MeResponse } from '@/shared/api/contracts/auth'
import { isApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/queryKeys'
import { routes } from '@/shared/config/routes'
import { UserAvatar } from '@/features/users/UserAvatar'
import { cn } from '@/shared/lib/cn'

/**
 * The account in the top bar: the user's initials and name, opening a small panel with "Log out".
 * A disclosure (a button that shows and hides a panel), not an ARIA menu: one action doesn't need
 * a menu's arrow-key model. Escape or a click outside closes it.
 */
export function AccountMenu({ user }: { user: MeResponse }) {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const queryClient = useQueryClient()

  const signOut = useMutation({
    mutationFn: logout,
    // the gateway's session is gone; the redirect ends auth-service's login too, then comes back to /
    onSuccess: ({ redirectUrl }) => window.location.assign(redirectUrl),
    onError: error => {
      // a 401: the session had already ended, so there is nothing to log out of. Show the logged-out bar.
      if (isApiError(error) && error.status === 401) void queryClient.invalidateQueries({ queryKey: queryKeys.me })
    },
  })

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const failed = signOut.isError && !(isApiError(signOut.error) && signOut.error.status === 401)

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="flex cursor-pointer items-center gap-2 rounded-btn py-1 pr-1 pl-1 hover:bg-surface sm:pr-2"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(o => !o)}
      >
        <UserAvatar username={user.username} />
        <span className="hidden text-small font-medium text-ink sm:inline">{user.username}</span>
        <span className="sr-only sm:hidden">{user.username}</span>
        <ChevronDown className={cn('hidden size-4 text-muted transition-transform sm:block', open && 'rotate-180')} aria-hidden="true" />
      </button>

      <div
        id={panelId}
        className={cn(
          'absolute top-full right-0 z-50 mt-2 w-56 overflow-hidden rounded-md border border-line bg-bg py-1.5 shadow-[0_16px_40px_-16px_rgb(20_24_51/0.25)]',
          !open && 'hidden',
        )}
      >
        <p className="truncate px-4 pt-1 pb-2 text-label text-muted">Logged in as <span className="font-medium text-ink">{user.username}</span></p>
        <Link
          to={routes.profile}
          onClick={() => setOpen(false)}
          className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-small font-medium text-ink hover:bg-surface"
        >
          <User className="size-4 text-muted" aria-hidden="true" />
          My profile
        </Link>
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-small font-medium text-ink hover:bg-surface disabled:cursor-default disabled:opacity-60"
          disabled={signOut.isPending}
          onClick={() => signOut.mutate()}
        >
          {signOut.isPending
            ? <Loader2 className="size-4 animate-spin text-muted" aria-hidden="true" />
            : <LogOut className="size-4 text-muted" aria-hidden="true" />}
          {signOut.isPending ? 'Logging out…' : 'Log out'}
        </button>
        <p role="status" className={cn('text-label text-ink', failed ? 'px-4 pb-2' : 'sr-only')}>
          {failed ? "Couldn't log out. Try again." : ''}
        </p>
      </div>
    </div>
  )
}

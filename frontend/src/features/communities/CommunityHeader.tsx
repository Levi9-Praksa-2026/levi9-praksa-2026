import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CircleAlert, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { useCurrentUser } from '@/features/users/useCurrentUser'
import { deactivateCommunity, updateCommunityDescription } from '@/shared/api/communities'
import type { CommunityDetailResponse } from '@/shared/api/contracts/communities'
import { queryKeys } from '@/shared/api/queryKeys'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { TextArea } from '@/shared/ui/TextArea'
import { CommunityAvatar } from './CommunityAvatar'

const DESCRIPTION_MAX = 2000
const iconAction = 'grid size-8 flex-none cursor-pointer place-items-center rounded-btn text-muted hover:bg-surface hover:text-ink'

export interface CommunityHeaderProps {
  community: CommunityDetailResponse
  /** After a shut-down the page keeps this header but drops the actions. */
  shutDown?: boolean
  onDeactivated?: () => void
}

/**
 * The community's header, like the profile's: the name and description sit together, and an admin's
 * edit turns that description into a form in place (not a popup). The warning for a shut-down is a
 * modal over a blurred page: the action is deactivation, but it is worth pausing for.
 */
export function CommunityHeader({ community, shutDown = false, onDeactivated }: CommunityHeaderProps) {
  const { user } = useCurrentUser()
  const client = useQueryClient()
  const isAdmin = user?.roles.includes('ADMIN') ?? false
  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState(community.description ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  const save = useMutation({
    mutationFn: () => updateCommunityDescription(community.name, { description }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.communities.all })
      setEditing(false)
    },
    onError: () => setMessage("Couldn't save the description. Try again."),
  })

  const deactivate = useMutation({
    mutationFn: () => deactivateCommunity(community.name),
    onSuccess: () => {
      // Only listings change: the detail query would now 404, and the page keeps its own state.
      void client.invalidateQueries({ queryKey: queryKeys.communities.list({}) })
      setConfirming(false)
      onDeactivated?.()
    },
    onError: () => setMessage("Couldn't deactivate the community. Try again."),
  })

  // Move focus into the dialog and let Escape close it from anywhere, without autofocusing a button.
  useEffect(() => {
    if (!confirming) return
    dialogRef.current?.focus()
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !deactivate.isPending) setConfirming(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [confirming, deactivate.isPending])

  function openEditor() {
    setDescription(community.description ?? '')
    setMessage(null)
    setEditing(true)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    save.mutate()
  }

  function onEscape(event: KeyboardEvent<HTMLElement>, close: () => void) {
    if (event.key !== 'Escape') return
    event.preventDefault()
    close()
  }

  return (
    <>
      <header className="flex flex-wrap items-start gap-4 rounded-lg border border-line bg-bg p-card-pad">
        <CommunityAvatar name={community.name} size="md" />
        <div className="min-w-0 flex-1">
          <h1 id="community-title" className="truncate text-h3">l/{community.name}</h1>
          {editing ? (
            <form onSubmit={submit} className="mt-2 grid gap-2">
              <TextArea
                label="Description"
                rows={3}
                value={description}
                maxLength={DESCRIPTION_MAX}
                disabled={save.isPending}
                onChange={event => setDescription(event.target.value)}
                onKeyDown={event => onEscape(event, () => setEditing(false))}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={save.isPending} onKeyDown={event => onEscape(event, () => setEditing(false))}>
                  {save.isPending ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditing(false)}
                  disabled={save.isPending}
                  onKeyDown={event => onEscape(event, () => setEditing(false))}
                >
                  Cancel
                </Button>
              </div>
              <p role="status" className={cn('text-small font-medium text-accent', message ? '' : 'sr-only')}>{message ?? ''}</p>
            </form>
          ) : (
            <>
              {community.description && !shutDown && <p className="mt-1 text-small text-muted">{community.description}</p>}
              <p className="mt-1 text-label text-muted">
                {community.memberCount} member{community.memberCount === 1 ? '' : 's'}
                {shutDown && ' · Shut down'}
              </p>
            </>
          )}
        </div>
        {!shutDown && !editing && (
          <div className="flex flex-none items-center gap-2">
            {isAdmin && (
              <>
                <button type="button" aria-label="Edit description" onClick={openEditor} className={iconAction}>
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Deactivate community"
                  onClick={() => { setMessage(null); setConfirming(true) }}
                  className={iconAction}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </>
            )}
            <Link
              to={routes.submit(community.name)}
              className="flex flex-none items-center gap-1.5 self-start rounded-btn bg-action px-3 py-2 text-small font-medium text-action-ink hover:opacity-90"
            >
              <Plus className="size-4" aria-hidden="true" /> Create post
            </Link>
          </div>
        )}
      </header>

      {confirming && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#141833]/45 p-4 backdrop-blur-sm">
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="deactivate-title"
            aria-describedby="deactivate-description"
            className="w-full max-w-md rounded-lg border border-line-strong bg-bg p-card-pad shadow-[0_24px_60px_-20px_rgb(20_24_51/0.5)]"
          >
            <CircleAlert className="size-8 text-accent" aria-hidden="true" />
            <h2 id="deactivate-title" className="mt-3 text-h3">Deactivate l/{community.name}?</h2>
            <p id="deactivate-description" className="mt-2 text-small text-muted">
              The community and its posts will be hidden from everyone. Nothing is deleted — an admin can
              reactivate it later.
            </p>
            {message && <p role="alert" className="mt-2 text-small font-medium text-accent">{message}</p>}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setConfirming(false)} disabled={deactivate.isPending}>
                Cancel
              </Button>
              <Button type="button" onClick={() => deactivate.mutate()} disabled={deactivate.isPending}>
                {deactivate.isPending ? 'Deactivating…' : 'Deactivate community'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

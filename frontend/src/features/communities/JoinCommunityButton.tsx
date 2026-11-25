import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { joinCommunity } from '@/shared/api/communities'
import { cn } from '@/shared/lib/cn'

export interface JoinCommunityButtonProps {
  name: string
  className?: string
}

/**
 * TODO(community-search): `joinCommunity` is still an in-memory mock. Swap it for the real
 * `PUT /api/communities/{name}/members/me` when the browser session reaches the gateway; the props
 * and the idle/pending/joined/failed states stay the same.
 */
export function JoinCommunityButton({ name, className }: JoinCommunityButtonProps) {
  const [state, setState] = useState<'idle' | 'pending' | 'joined' | 'failed'>('idle')

  async function join() {
    setState('pending')
    try {
      await joinCommunity(name)
      setState('joined')
    } catch {
      setState('failed')
    }
  }

  if (state === 'joined') {
    return <span className={cn('flex-none text-label font-medium text-accent', className)}>Joined</span>
  }

  return (
    <button
      type="button"
      disabled={state === 'pending'}
      onClick={() => void join()}
      className={cn(
        'flex flex-none cursor-pointer items-center gap-1.5 rounded-btn border border-line px-3 py-2 text-small font-medium text-ink hover:bg-surface disabled:cursor-wait disabled:opacity-60',
        state === 'failed' && 'border-accent text-accent',
        className,
      )}
    >
      {state === 'pending'
        ? <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        : <Plus className="size-4" aria-hidden="true" />}
      {state === 'failed' ? 'Retry join' : state === 'pending' ? 'Joining…' : 'Join'}
    </button>
  )
}

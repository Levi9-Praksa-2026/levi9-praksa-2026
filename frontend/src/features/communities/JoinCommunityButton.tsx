import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, UserMinus, UserPlus } from 'lucide-react'
import { useCurrentUser } from '@/features/users/useCurrentUser'
import { joinCommunity, leaveCommunity } from '@/shared/api/communities'
import { queryKeys } from '@/shared/api/queryKeys'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { useCommunityMembership } from './hooks'

const actionButton = 'flex flex-none cursor-pointer items-center gap-1.5 rounded-btn border border-line px-3 py-2 text-small font-medium text-ink hover:bg-surface disabled:cursor-wait disabled:opacity-60'

export interface JoinCommunityButtonProps {
  name: string
  className?: string
}

/**
 * The directory row's Join: the endpoint is idempotent, so no per-row membership lookup is needed.
 * The community page uses `CommunityMembershipButton` below, which knows the caller's real state.
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
      className={cn(actionButton, state === 'failed' && 'border-accent text-accent', className)}
    >
      {state === 'pending' ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
      {state === 'failed' ? 'Retry join' : state === 'pending' ? 'Joining…' : 'Join'}
    </button>
  )
}

/**
 * The community page's Join/Leave. The membership query lives in the logged-in child only: a visitor
 * without a session renders the login link and never calls /members/me.
 */
export function CommunityMembershipButton({ name, className }: JoinCommunityButtonProps) {
  const { user } = useCurrentUser()

  if (user === null) {
    return (
      <a href={routes.login} aria-label="Log in to join" className={cn(actionButton, className)}>
        <UserPlus className="size-4" aria-hidden="true" /> Join
      </a>
    )
  }

  if (user === undefined) {
    return (
      <button type="button" disabled className={cn(actionButton, className)}>
        <UserPlus className="size-4" aria-hidden="true" /> Join
      </button>
    )
  }

  return <LoggedInMembershipButton name={name} userId={user.id} className={className} />
}

function LoggedInMembershipButton({ name, userId, className }: JoinCommunityButtonProps & { userId: number }) {
  const client = useQueryClient()
  const membership = useCommunityMembership(name, userId)

  function invalidate() {
    void client.invalidateQueries({ queryKey: queryKeys.communities.membership(name, userId) })
    void client.invalidateQueries({ queryKey: queryKeys.communities.detail(name) })
    void client.invalidateQueries({ queryKey: queryKeys.communities.list({}) })
  }

  const join = useMutation({ mutationFn: () => joinCommunity(name), onSuccess: invalidate })
  const leave = useMutation({ mutationFn: () => leaveCommunity(name), onSuccess: invalidate })

  const joined = membership.data?.joined ?? false
  const pending = membership.isPending || join.isPending || leave.isPending
  const error = membership.isError
    ? `Couldn't check your membership in l/${name}.`
    : join.isError
      ? `Couldn't join l/${name}. Try again.`
      : leave.isError
        ? `Couldn't leave l/${name}. Try again.`
        : null

  return (
    <div className={cn('flex flex-col items-end gap-1', className)}>
      <button
        type="button"
        disabled={pending}
        onClick={() => (joined ? leave.mutate() : join.mutate())}
        className={actionButton}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : joined ? (
          <UserMinus className="size-4" aria-hidden="true" />
        ) : (
          <UserPlus className="size-4" aria-hidden="true" />
        )}
        {pending ? (joined ? 'Leaving…' : 'Joining…') : joined ? 'Leave' : 'Join'}
      </button>
      {error && <p role="alert" className="text-label text-accent">{error}</p>}
    </div>
  )
}

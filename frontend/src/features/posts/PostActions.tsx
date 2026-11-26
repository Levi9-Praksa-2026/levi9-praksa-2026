import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useCurrentUser } from '@/features/users/useCurrentUser'
import type { PostResponse } from '@/shared/api/contracts/posts'
import { routes } from '@/shared/config/routes'
import { useRemovePost } from './hooks'
import { removeErrorMessage } from './messages'

export interface PostActionsProps {
  post: Pick<PostResponse, 'id' | 'authorId'>
  onEdit: () => void
}

const action = 'flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-label text-muted hover:bg-surface hover:text-ink'

/**
 * Edit for the author, Remove for the author or an admin (post-service's rules); nothing for anyone else.
 * Remove asks first, in place, then goes Home: the post is gone for everyone.
 */
export function PostActions({ post, onEdit }: PostActionsProps) {
  const { user } = useCurrentUser()
  const navigate = useNavigate()
  const remove = useRemovePost(post.id)
  const [confirming, setConfirming] = useState(false)

  if (!user) return null
  const isAuthor = user.id === post.authorId
  const canRemove = isAuthor || user.roles.includes('ADMIN')
  if (!canRemove) return null

  if (confirming) {
    return (
      <div role="group" aria-label="Remove this post?" className="flex basis-full flex-wrap items-center gap-2 rounded-md border border-accent bg-surface px-3 py-2">
        <p className="mr-auto text-small text-ink">
          {remove.error ? removeErrorMessage(remove.error) : 'Remove this post? It disappears for everyone.'}
        </p>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={remove.isPending}
          className="cursor-pointer rounded-btn px-3 py-1.5 text-small font-medium text-ink hover:bg-bg disabled:cursor-wait"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => remove.mutate(undefined, { onSuccess: () => navigate(routes.home) })}
          disabled={remove.isPending}
          className="cursor-pointer rounded-btn bg-action px-3 py-1.5 text-small font-medium text-action-ink hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          {remove.isPending ? 'Removing…' : 'Remove post'}
        </button>
      </div>
    )
  }

  return (
    <div className="ml-auto flex items-center gap-1">
      {isAuthor && (
        <button type="button" onClick={onEdit} className={action}>
          <Pencil className="size-4" aria-hidden="true" /> Edit
        </button>
      )}
      {canRemove && (
        <button type="button" onClick={() => setConfirming(true)} className={action}>
          <Trash2 className="size-4" aria-hidden="true" /> Remove
        </button>
      )}
    </div>
  )
}

import { ArrowBigDown, ArrowBigUp } from 'lucide-react'
import { useRef, useState } from 'react'
import { useCurrentUser } from '@/features/users/useCurrentUser'
import type { VoteValue } from '@/shared/api/contracts/common'
import type { PostResponse } from '@/shared/api/contracts/posts'
import { unvotePost, votePost } from '@/shared/api/posts'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { nextVote, scoreWith } from './vote'

export interface PostVoteProps {
  post: Pick<PostResponse, 'id' | 'authorId' | 'score' | 'myVote'>
}

const arrow = 'grid size-8 place-items-center rounded-full transition-colors'

/**
 * Up, score, down. A click shows at once and goes back to the last accepted vote if its request fails.
 * Logged out, the arrows lead to Log in; on your own post they are off, since post-service refuses that vote (422).
 */
export function PostVote({ post }: PostVoteProps) {
  const { user } = useCurrentUser()
  const serverVote = post.myVote ?? null
  const [vote, setVote] = useState<VoteValue | null>(serverVote)
  const [failed, setFailed] = useState(false)
  const score = scoreWith(post.score, serverVote, vote)

  // Requests go out one after another in click order, so the last click is the one the server keeps.
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  // The vote the server last accepted: where a failed click goes back to.
  const accepted = useRef(serverVote)
  const clicks = useRef(0)

  function click(clicked: VoteValue) {
    const after = nextVote(vote, clicked)
    const n = ++clicks.current
    setVote(after)
    setFailed(false)
    queue.current = queue.current
      .then(() => (after === null ? unvotePost(post.id) : votePost(post.id, after)))
      .then(
        () => {
          accepted.current = after
        },
        () => {
          // A newer click is already on its way and will settle the arrows itself.
          if (n !== clicks.current) return
          setVote(accepted.current)
          setFailed(true)
        },
      )
  }

  const scoreText = (
    <span className={cn('min-w-6 text-center font-medium tabular-nums', vote === null ? 'text-ink' : 'text-accent')}>
      {score}
    </span>
  )

  // Logged out (or not known yet): the arrows are links to Log in.
  if (!user) {
    return (
      <div className="flex items-center gap-0.5" aria-label={`${score} points`} role="group">
        <a href={routes.login} aria-label="Log in to upvote" className={cn(arrow, 'text-muted hover:bg-surface hover:text-accent')}>
          <ArrowBigUp className="size-5" aria-hidden="true" />
        </a>
        {scoreText}
        <a href={routes.login} aria-label="Log in to downvote" className={cn(arrow, 'text-muted hover:bg-surface hover:text-accent')}>
          <ArrowBigDown className="size-5" aria-hidden="true" />
        </a>
      </div>
    )
  }

  const own = user.id === post.authorId
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5" aria-label={`${score} points`} role="group">
        <VoteButton value={1} vote={vote} own={own} onClick={click} />
        {scoreText}
        <VoteButton value={-1} vote={vote} own={own} onClick={click} />
      </div>
      <span role="status" className="text-label text-accent">{failed ? "Couldn't vote, try again" : ''}</span>
    </div>
  )
}

interface VoteButtonProps {
  value: VoteValue
  vote: VoteValue | null
  own: boolean
  onClick: (value: VoteValue) => void
}

function VoteButton({ value, vote, own, onClick }: VoteButtonProps) {
  const Icon = value === 1 ? ArrowBigUp : ArrowBigDown
  const pressed = vote === value
  return (
    <button
      type="button"
      aria-label={value === 1 ? 'Upvote' : 'Downvote'}
      aria-pressed={pressed}
      disabled={own}
      title={own ? "You can't vote on your own post" : undefined}
      onClick={() => onClick(value)}
      className={cn(
        arrow,
        'cursor-pointer disabled:cursor-not-allowed disabled:opacity-40',
        pressed ? 'text-accent' : 'text-muted enabled:hover:bg-surface enabled:hover:text-accent',
      )}
    >
      <Icon className="size-5" fill={pressed ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  )
}

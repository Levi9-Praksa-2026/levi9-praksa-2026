import type { Reply } from '@/features/posts/types'
import '@/features/posts/posts.css'

export interface ReplyCardProps {
  reply: Reply
  className?: string
}

/** The initials avatar: the handle's first two letters on the brand tint. */
function initials(handle: string): string {
  return handle.replace(/[^a-z]/gi, '').slice(0, 2).toUpperCase()
}

/** One reply in a thread: avatar, who and where from, the text, votes. Presentational only. */
export function ReplyCard({ reply, className }: ReplyCardProps) {
  const classes = ['lv-reply', reply.depth === 1 ? 'lv-reply--nested' : '', className ?? ''].filter(Boolean).join(' ')
  return (
    <article className={classes}>
      <span className="lv-reply__avatar" aria-hidden="true">
        {initials(reply.author)}
      </span>
      <div className="lv-reply__body">
        <p className="lv-reply__meta">
          <strong>u/{reply.author}</strong> · {reply.office} · {reply.age}
        </p>
        <p className="lv-reply__text">{reply.body}</p>
        <p className="lv-reply__votes">▲ {reply.votes}</p>
      </div>
    </article>
  )
}

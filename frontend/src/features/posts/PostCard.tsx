import { CommunityChip } from '@/features/communities/CommunityChip'
import type { Post } from '@/features/posts/types'
import '@/features/posts/posts.css'

export interface PostCardProps {
  post: Post
  /** Hide the community label, for a list that already sits inside one community. */
  hideCommunity?: boolean
  /** A shorter meta line and smaller title, for a narrow cell. */
  compact?: boolean
  className?: string
}

/** One post in a feed: votes, community, title, who and where from, replies. Presentational only. */
export function PostCard({ post, hideCommunity = false, compact = false, className }: PostCardProps) {
  const classes = ['lv-post', compact ? 'lv-post--compact' : '', className ?? ''].filter(Boolean).join(' ')
  return (
    <article className={classes}>
      <div className="lv-post__votes" aria-label={`${post.votes} votes`}>
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M2.5 7.5 6 4l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{post.votes}</span>
      </div>
      <div className="lv-post__body">
        {!hideCommunity && <CommunityChip community={{ slug: post.community }} />}
        <p className="lv-post__title">{post.title}</p>
        <p className="lv-post__meta">
          {compact ? `${post.office} · ${post.replies} replies` : `u/${post.author} · ${post.office} · ${post.age} · ${post.replies} replies`}
        </p>
      </div>
    </article>
  )
}

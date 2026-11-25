import { MessageSquare } from 'lucide-react'
import { Link } from 'react-router'
import type { PostResponse } from '@/shared/api/contracts/posts'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { PostImages, PostMeta, ShareButton } from './PostParts'
import { PostVote } from './PostVote'

export interface PostCardProps {
  post: PostResponse
  /** Leave out the community, for a list that already sits inside one. */
  hideCommunity?: boolean
  className?: string
}

/** One post in a feed: where and who from, the title (a link to the post), a short preview, its images, then actions. */
export function PostCard({ post, hideCommunity = false, className }: PostCardProps) {
  const titleId = `post-${post.id}-title`

  return (
    <article aria-labelledby={titleId} className={cn('grid gap-3 rounded-lg border border-line bg-bg p-card-pad', className)}>
      <header>
        <PostMeta post={post} hideCommunity={hideCommunity} />
      </header>

      <div className="grid gap-1.5">
        {/* `text-card` would read as the card colour (--color-card), so the size is named as a length. Text
            font like the h4 default: a feed of display-font titles is loud. */}
        <h2 id={titleId} className="font-text text-(length:--t-card) leading-[1.3] font-semibold tracking-[-0.01em] break-words text-ink">
          <Link to={routes.post(post.id)} className="hover:text-accent">{post.title}</Link>
        </h2>
        {post.content && (
          <p className="line-clamp-3 text-small whitespace-pre-line break-words text-muted">{post.content}</p>
        )}
      </div>

      {post.images.length > 0 && <PostImages images={post.images} />}

      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-muted">
        <PostVote post={post} />
        <CommentCount postId={post.id} count={post.commentCount} />
        <ShareButton postId={post.id} />
      </footer>
    </article>
  )
}

/** "3 comments", a link to the post's comments. */
export function CommentCount({ postId, count }: { postId: number; count: number }) {
  return (
    <Link
      to={`${routes.post(postId)}#comments`}
      className="flex items-center gap-1.5 rounded-full px-2 py-1 text-label text-muted hover:bg-surface hover:text-ink"
    >
      <MessageSquare className="size-4" aria-hidden="true" />
      {count} {count === 1 ? 'comment' : 'comments'}
    </Link>
  )
}

/** The card's shape while the feed loads. */
export function PostCardSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-3 rounded-lg border border-line bg-bg p-card-pad">
      <span className="h-3 w-48 max-w-full animate-pulse rounded-sm bg-surface" />
      <span className="h-5 w-3/4 animate-pulse rounded-sm bg-surface" />
      <span className="grid gap-1.5">
        <span className="h-3 w-full animate-pulse rounded-sm bg-surface" />
        <span className="h-3 w-5/6 animate-pulse rounded-sm bg-surface" />
      </span>
      <span className="h-3 w-32 animate-pulse rounded-sm bg-surface" />
    </div>
  )
}

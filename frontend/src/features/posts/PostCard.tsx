import { MessageSquare } from 'lucide-react'
import { Link } from 'react-router'
import { CommunityAvatar } from '@/features/communities/CommunityAvatar'
import type { PostImage, PostResponse } from '@/shared/api/contracts/posts'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { relativeTime } from '@/shared/lib/relativeTime'

export interface PostCardProps {
  post: PostResponse
  /** Leave out the community, for a list that already sits inside one. */
  hideCommunity?: boolean
  className?: string
}

/**
 * One post in a feed: where and who from, title, a short preview, its images, then score and comments.
 * The title and the comment count are plain text until a post has its own page.
 */
export function PostCard({ post, hideCommunity = false, className }: PostCardProps) {
  const communityName = hideCommunity ? null : post.communityName
  const titleId = `post-${post.id}-title`

  return (
    <article aria-labelledby={titleId} className={cn('grid gap-3 rounded-lg border border-line bg-bg p-card-pad', className)}>
      <header className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-label text-muted">
        {communityName && (
          <>
            <Link
              to={routes.community(communityName)}
              className="flex min-w-0 items-center gap-1.5 font-medium text-ink hover:text-accent"
            >
              <CommunityAvatar name={communityName} className="size-5 text-[11px]" />
              <span className="truncate">l/{communityName}</span>
            </Link>
            <span aria-hidden="true">·</span>
          </>
        )}
        <span className="truncate">u/{post.authorUsername}</span>
        <span aria-hidden="true">·</span>
        <PostDate createdAt={post.createdAt} updatedAt={post.updatedAt} />
      </header>

      <div className="grid gap-1.5">
        {/* `text-card` would read as the card colour (--color-card), so the size is named as a length. Text
            font like the h4 default: a feed of display-font titles is loud. */}
        <h2 id={titleId} className="font-text text-(length:--t-card) leading-[1.3] font-semibold tracking-[-0.01em] break-words text-ink">
          {post.title}
        </h2>
        {post.content && (
          <p className="line-clamp-3 text-small whitespace-pre-line break-words text-muted">{post.content}</p>
        )}
      </div>

      {post.images.length > 0 && <PostImages images={post.images} />}

      <footer className="flex items-center gap-4 text-label text-muted">
        <span className="font-medium text-ink">
          {post.score} {post.score === 1 || post.score === -1 ? 'point' : 'points'}
        </span>
        <span className="flex items-center gap-1.5">
          <MessageSquare className="size-4" aria-hidden="true" />
          {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
        </span>
      </footer>
    </article>
  )
}

/** "3h ago", with the exact moment on hover and for machines; "edited" once the author changed it. */
function PostDate({ createdAt, updatedAt }: { createdAt: string; updatedAt: string | null }) {
  return (
    <>
      <time dateTime={createdAt} title={new Date(createdAt).toLocaleString()}>{relativeTime(createdAt)}</time>
      {updatedAt && (
        <span title={`Edited ${new Date(updatedAt).toLocaleString()}`}>(edited)</span>
      )}
    </>
  )
}

/** One image at its own shape (capped in height); two or three side by side as squares. */
function PostImages({ images }: { images: readonly PostImage[] }) {
  const single = images.length === 1
  return (
    <div className={cn('grid gap-2', !single && (images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'))}>
      {images.map((image, index) => (
        <img
          key={image.id}
          src={image.url}
          // Uploads carry no description; say there is an image and which one.
          alt={single ? 'Post image' : `Post image ${index + 1} of ${images.length}`}
          loading="lazy"
          decoding="async"
          className={cn(
            'w-full rounded-md border border-line bg-surface object-cover',
            single ? 'max-h-[400px]' : 'aspect-square',
          )}
        />
      ))}
    </div>
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

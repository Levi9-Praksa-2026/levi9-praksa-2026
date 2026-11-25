import { Check, Link2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { CommunityAvatar } from '@/features/communities/CommunityAvatar'
import type { PostImage, PostResponse } from '@/shared/api/contracts/posts'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { relativeTime } from '@/shared/lib/relativeTime'

/* The pieces the feed card and the post page share. */

export interface PostMetaProps {
  post: Pick<PostResponse, 'communityName' | 'authorUsername' | 'createdAt' | 'updatedAt'>
  /** Leave out the community, for a list that already sits inside one. */
  hideCommunity?: boolean
}

/** "l/frontend · u/ana · 3h ago (edited)": where, who, when. The community is left out when an older post has no name. */
export function PostMeta({ post, hideCommunity = false }: PostMetaProps) {
  const communityName = hideCommunity ? null : post.communityName
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-label text-muted">
      {communityName && (
        <>
          <Link to={routes.community(communityName)} className="flex min-w-0 items-center gap-1.5 font-medium text-ink hover:text-accent">
            <CommunityAvatar name={communityName} className="size-5 text-[11px]" />
            <span className="truncate">l/{communityName}</span>
          </Link>
          <span aria-hidden="true">·</span>
        </>
      )}
      <span className="truncate">u/{post.authorUsername}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={post.createdAt} title={new Date(post.createdAt).toLocaleString()}>{relativeTime(post.createdAt)}</time>
      {post.updatedAt && <span title={`Edited ${new Date(post.updatedAt).toLocaleString()}`}>(edited)</span>}
    </div>
  )
}

export interface PostImagesProps {
  images: readonly PostImage[]
  /**
   * card: one image at its own shape (capped in height), two or three side by side as squares.
   * page: each image whole, one under the other, and a link to the file at full size.
   */
  variant?: 'card' | 'page'
}

export function PostImages({ images, variant = 'card' }: PostImagesProps) {
  const many = images.length > 1
  // Uploads carry no description; say there is an image and which one.
  const alt = (index: number) => (many ? `Post image ${index + 1} of ${images.length}` : 'Post image')

  if (variant === 'page') {
    return (
      <div className="grid gap-3">
        {images.map((image, index) => (
          <a key={image.id} href={image.url} target="_blank" rel="noreferrer" className="block rounded-md focus-visible:outline-2">
            <img
              src={image.url}
              alt={alt(index)}
              decoding="async"
              className="max-h-[80vh] w-full rounded-md border border-line bg-surface object-contain"
            />
          </a>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('grid gap-2', many && (images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'))}>
      {images.map((image, index) => (
        <img
          key={image.id}
          src={image.url}
          alt={alt(index)}
          loading="lazy"
          decoding="async"
          className={cn('w-full rounded-md border border-line bg-surface object-cover', many ? 'aspect-square' : 'max-h-[400px]')}
        />
      ))}
    </div>
  )
}

/** Copies the post's address. Says "Link copied" for a moment, also to screen readers. */
export function ShareButton({ postId }: { postId: number }) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function share() {
    try {
      await navigator.clipboard.writeText(new URL(routes.post(postId), window.location.origin).href)
      setFailed(false)
      setCopied(true)
    } catch {
      // No clipboard (an old browser, or permission refused): say so rather than pretend.
      setFailed(true)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-label text-muted hover:bg-surface hover:text-ink"
    >
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
      <span role="status">{copied ? 'Link copied' : failed ? "Couldn't copy" : 'Share'}</span>
    </button>
  )
}

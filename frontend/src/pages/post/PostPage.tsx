import { useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { CommentList } from '@/features/comments/CommentList'
import { usePost } from '@/features/posts/hooks'
import { PostImages, PostMeta, ShareButton } from '@/features/posts/PostParts'
import { PostVote } from '@/features/posts/PostVote'
import { isApiError } from '@/shared/api/errors'
import { routes } from '@/shared/config/routes'

/** `/posts/:id`: one post in full, then its comments. Anyone may read it; voting asks for a login. */
export function PostPage() {
  const { id = '' } = useParams()
  const postId = Number(id)
  // `/posts/abc` or `/posts/0` can't be a post: show "gone" without asking the server.
  if (!Number.isSafeInteger(postId) || postId < 1) return <PostGone />
  return <PostView postId={postId} />
}

function PostView({ postId }: { postId: number }) {
  const { data: post, error, isPending, refetch } = usePost(postId)
  const { hash } = useLocation()
  const loaded = post !== undefined

  // "3 comments" on a card links to #comments; the section only exists once the post is in, so jump then.
  useEffect(() => {
    if (loaded && hash === '#comments') document.getElementById('comments')?.scrollIntoView()
  }, [loaded, hash])

  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Loading post" className="grid gap-4 rounded-lg border border-line bg-bg p-card-pad">
        <span className="h-3 w-48 max-w-full animate-pulse rounded-sm bg-surface" />
        <span className="h-7 w-3/4 animate-pulse rounded-sm bg-surface" />
        <span className="grid gap-2">
          <span className="h-3 w-full animate-pulse rounded-sm bg-surface" />
          <span className="h-3 w-full animate-pulse rounded-sm bg-surface" />
          <span className="h-3 w-2/3 animate-pulse rounded-sm bg-surface" />
        </span>
      </div>
    )
  }

  if (error) {
    if (isApiError(error) && error.status === 404) return <PostGone />
    return (
      <div className="rounded-lg border border-line bg-bg px-card-pad py-10 text-center">
        <h1 className="text-h3">Couldn't load this post</h1>
        <p className="mt-2 text-small text-muted">Check your connection and try again.</p>
        <button type="button" onClick={() => void refetch()} className="mt-4 cursor-pointer text-small font-medium text-accent underline underline-offset-2">
          Try again
        </button>
      </div>
    )
  }

  return (
    // The post and its comments on one white surface, split only by a hairline.
    <div className="grid gap-6 rounded-lg border border-line bg-bg p-card-pad">
      <article aria-labelledby="post-title" className="grid gap-4">
        <header className="grid gap-2">
          <PostMeta post={post} />
          <h1 id="post-title" className="text-h3 break-words">{post.title}</h1>
        </header>

        {post.content && <p className="text-body whitespace-pre-line break-words text-ink">{post.content}</p>}

        {post.images.length > 0 && <PostImages images={post.images} variant="page" />}

        <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-muted">
          <PostVote post={post} />
          <ShareButton postId={post.id} />
        </footer>
      </article>
      <CommentList
        postId={post.id}
        postAuthorId={post.authorId}
        commentCount={post.commentCount}
        className="border-t border-line pt-5"
      />
    </div>
  )
}

/** A post that never existed or was removed: post-service answers 404 for both, and so do we. */
function PostGone() {
  return (
    <div className="rounded-lg border border-line bg-bg px-card-pad py-10 text-center">
      <h1 className="text-h3">This post is gone</h1>
      <p className="mt-2 text-small text-muted">It was removed, or the link is mistyped.</p>
      <Link to={routes.home} className="mt-4 inline-block text-small font-medium text-accent underline underline-offset-2">
        Back to Home
      </Link>
    </div>
  )
}

import { useCallback } from 'react'
import { useComments } from '@/features/posts/hooks'
import { useStayOnExistingPage } from '@/features/posts/pastLastPage'
import { UserAvatar } from '@/features/users/UserAvatar'
import type { CommentResponse } from '@/shared/api/contracts/posts'
import { useUrlPage } from '@/shared/hooks/useUrlPage'
import { cn } from '@/shared/lib/cn'
import { relativeTime } from '@/shared/lib/relativeTime'
import { Pagination } from '@/shared/ui/Pagination'

const PAGE_SIZE = 20

export interface CommentListProps {
  postId: number
  /** The post's author: their comments are marked OP. */
  postAuthorId: number
  /** The post's own count, for the heading while the first page loads. */
  commentCount: number
  className?: string
}

/**
 * A post's comments: a flat list, newest first, 20 a page with the page in the URL. Read-only for now: post-service
 * can list comments but has no endpoint to write, remove or vote on one yet.
 */
export function CommentList({ postId, postAuthorId, commentCount, className }: CommentListProps) {
  const scrollToComments = useCallback(() => document.getElementById('comments')?.scrollIntoView(), [])
  const [page, setPage] = useUrlPage(scrollToComments)
  const { data, error, isPending, isPlaceholderData, refetch } = useComments(postId, page, PAGE_SIZE)
  useStayOnExistingPage(page, data?.totalPages, isPlaceholderData, setPage)
  const total = data?.totalElements ?? commentCount

  return (
    <section id="comments" aria-labelledby="comments-title" className={cn('grid scroll-mt-20 gap-4', className)}>
      <h2 id="comments-title" className="font-text text-(length:--t-card) leading-[1.3] font-semibold text-ink">
        {total} {total === 1 ? 'comment' : 'comments'}
      </h2>

      {isPending ? (
        <div aria-busy="true" aria-label="Loading comments" className="grid gap-5">
          {[0, 1].map(i => (
            <div key={i} className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-3">
              <span className="size-8 animate-pulse rounded-full bg-surface" />
              <span className="grid gap-2 pt-1">
                <span className="h-3 w-40 animate-pulse rounded-sm bg-surface" />
                <span className="h-3 w-full animate-pulse rounded-sm bg-surface" />
              </span>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="py-4 text-center">
          <p className="text-small text-muted">Couldn't load the comments.</p>
          <button type="button" onClick={() => void refetch()} className="mt-2 cursor-pointer text-small font-medium text-accent underline underline-offset-2">
            Try again
          </button>
        </div>
      ) : data.content.length === 0 ? (
        <p className="py-4 text-center text-small text-muted">No comments yet.</p>
      ) : (
        <>
          <ul aria-busy={isPlaceholderData} className={cn('grid', isPlaceholderData && 'opacity-60')}>
            {data.content.map(comment => (
              <li key={comment.id} className="group">
                <CommentItem comment={comment} byPostAuthor={comment.authorId === postAuthorId} />
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            itemLabel="comments"
            label="Comment pages"
            onChange={setPage}
          />
        </>
      )}
    </section>
  )
}

/**
 * One comment as a row, not a box: the avatar with a thin line running down beside the text, then who and when,
 * the text and its score. The post's author is marked OP.
 */
function CommentItem({ comment, byPostAuthor }: { comment: CommentResponse; byPostAuthor: boolean }) {
  return (
    <article aria-label={`Comment by ${comment.authorUsername}`} className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-3">
      <div className="flex flex-col items-center">
        <UserAvatar username={comment.authorUsername} />
        <span aria-hidden="true" className="mt-1.5 w-px flex-1 bg-line group-last:hidden" />
      </div>
      <div className="grid min-w-0 gap-1 pb-5 group-last:pb-0">
        <div className="flex min-h-8 flex-wrap items-center gap-x-1.5 text-label text-muted">
          <span className="truncate font-semibold text-ink">{comment.authorUsername}</span>
          {byPostAuthor && (
            <span title="Wrote the post" className="font-semibold text-accent">
              OP<span className="sr-only"> (wrote the post)</span>
            </span>
          )}
          <span aria-hidden="true">·</span>
          <time dateTime={comment.createdAt} title={new Date(comment.createdAt).toLocaleString()}>
            {relativeTime(comment.createdAt)}
          </time>
          {comment.updatedAt && (
            <>
              <span aria-hidden="true">·</span>
              <span title={new Date(comment.updatedAt).toLocaleString()}>Edited {relativeTime(comment.updatedAt)}</span>
            </>
          )}
        </div>
        <p className="text-small whitespace-pre-line break-words text-ink">{comment.content}</p>
        <p className="text-label text-muted">
          {comment.score} {comment.score === 1 || comment.score === -1 ? 'point' : 'points'}
        </p>
      </div>
    </article>
  )
}

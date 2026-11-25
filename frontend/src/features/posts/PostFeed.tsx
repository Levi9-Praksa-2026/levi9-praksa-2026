import { useUrlPage } from '@/shared/hooks/useUrlPage'
import { cn } from '@/shared/lib/cn'
import { Pagination } from '@/shared/ui/Pagination'
import { usePosts } from './hooks'
import { useStayOnExistingPage } from './pastLastPage'
import { PostCard, PostCardSkeleton } from './PostCard'

const PAGE_SIZE = 20

const scrollToTop = () => window.scrollTo({ top: 0 })

export interface PostFeedProps {
  /** Only this community's posts; all of them when left out. */
  communityId?: number
  /** Inside a community the card doesn't repeat its name. */
  hideCommunity?: boolean
  /** What the empty state says, e.g. "No posts in l/frontend yet." */
  emptyText?: string
  label: string
}

/**
 * Posts, newest first, a page at a time. The page lives in the URL (`?page=2` is the third), so it survives
 * back/forward and can be shared.
 */
export function PostFeed({ communityId, hideCommunity = false, emptyText = 'No posts yet.', label }: PostFeedProps) {
  const [page, setPage] = useUrlPage(scrollToTop)
  const { data, error, isPending, isPlaceholderData, refetch } = usePosts({ communityId, page, size: PAGE_SIZE })
  // A shared link can point past the last page (posts were removed since): move to the last one.
  useStayOnExistingPage(page, data?.totalPages, isPlaceholderData, setPage)

  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Loading posts" className="grid gap-3">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-line bg-bg px-card-pad py-10 text-center">
        <h2 className="text-h3">Couldn't load posts</h2>
        <p className="mt-2 text-small text-muted">Check your connection and try again.</p>
        <button type="button" onClick={() => void refetch()} className="mt-4 cursor-pointer text-small font-medium text-accent underline underline-offset-2">
          Try again
        </button>
      </div>
    )
  }

  if (data.content.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-bg px-card-pad py-10 text-center">
        <p className="text-small text-muted">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <ul aria-label={label} aria-busy={isPlaceholderData} className={cn('grid gap-3', isPlaceholderData && 'opacity-60')}>
        {data.content.map(post => (
          <li key={post.id}>
            <PostCard post={post} hideCommunity={hideCommunity} />
          </li>
        ))}
      </ul>
      <Pagination
        page={page}
        totalPages={data.totalPages}
        totalElements={data.totalElements}
        itemLabel="posts"
        label={`${label} pages`}
        onChange={setPage}
      />
    </div>
  )
}

import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { cn } from '@/shared/lib/cn'
import { Pagination } from '@/shared/ui/Pagination'
import { usePosts } from './hooks'
import { PostCard, PostCardSkeleton } from './PostCard'

const PAGE_SIZE = 20

export interface PostFeedProps {
  /** Only this community's posts; all of them when left out. */
  communityId?: number
  /** Inside a community the card doesn't repeat its name. */
  hideCommunity?: boolean
  /** What the empty state says, e.g. "No posts in l/frontend yet." */
  emptyText?: string
  label: string
}

/** Read a page number from the URL; anything invalid means the first page. */
function pageFromParams(params: URLSearchParams): number {
  const value = Number(params.get('page') ?? 0)
  return Number.isInteger(value) && value >= 0 ? value : 0
}

/**
 * Posts, newest first, a page at a time. The page lives in the URL (`?page=2` is the third), so it survives
 * back/forward and can be shared.
 */
export function PostFeed({ communityId, hideCommunity = false, emptyText = 'No posts yet.', label }: PostFeedProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = pageFromParams(searchParams)
  const { data, error, isPending, isPlaceholderData, refetch } = usePosts({ communityId, page, size: PAGE_SIZE })

  const setPage = useCallback((next: number) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      if (next === 0) params.delete('page')
      else params.set('page', String(next))
      return params
    })
    window.scrollTo({ top: 0 })
  }, [setSearchParams])

  // A shared link can point past the last page (posts were removed since); move to the last one.
  const totalPages = data?.totalPages ?? 0
  useEffect(() => {
    if (data && totalPages > 0 && page >= totalPages) setPage(totalPages - 1)
  }, [data, totalPages, page, setPage])

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

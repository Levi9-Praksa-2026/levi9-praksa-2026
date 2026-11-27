import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { CommunityListItem } from '@/features/communities/CommunityListItem'
import { useCommunityDirectory } from '@/features/communities/hooks'
import { useStayOnExistingPage } from '@/features/posts/pastLastPage'
import { usePosts } from '@/features/posts/hooks'
import { PostCard, PostCardSkeleton } from '@/features/posts/PostCard'
import type { CommunityListParams } from '@/shared/api/contracts/communities'
import { cn } from '@/shared/lib/cn'
import { Pagination } from '@/shared/ui/Pagination'
import { Select, type SelectOption } from '@/shared/ui/Select'

const POSTS_PAGE_SIZE = 5
/** As the community directory before it (10 a page). */
const COMMUNITIES_PAGE_SIZE = 10
const POSTS_PAGE = 'postsPage'
const COMMUNITIES_PAGE = 'communitiesPage'
const SORT_OPTIONS: readonly SelectOption<'new' | 'top'>[] = [
  { value: 'new', label: 'Newest' },
  { value: 'top', label: 'Most members' },
]
type View = 'all' | 'posts' | 'communities'
const VIEWS: readonly { value: View; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'posts', label: 'Posts' },
  { value: 'communities', label: 'Communities' },
]

/** Read one list's page number from the URL; anything invalid means the first page. */
function pageFromParams(params: URLSearchParams, key: string): number {
  const raw = params.get(key)
  if (raw === null) return 0
  const value = Number(raw)
  return Number.isInteger(value) && value >= 0 ? value : 0
}

/**
 * `/communities`: the page the header search lands on. A query shows posts first, then communities;
 * when neither has a match it becomes discovery, with the latest posts and all active communities.
 * The query, view, sort and each list's page live in the URL, so a view can be shared and survives back/forward.
 */
export function DiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const sort = searchParams.get('sort') === 'top' ? 'top' : 'new'
  const postsPage = pageFromParams(searchParams, POSTS_PAGE)
  const communitiesPage = pageFromParams(searchParams, COMMUNITIES_PAGE)
  const queryName = (searchParams.get('q') ?? '').trim()
  const rawView = searchParams.get('view')
  const view: View = rawView === 'posts' || rawView === 'communities' ? rawView : 'all'
  const searching = queryName !== ''

  const setPostsPage = useCallback((next: number) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      if (next === 0) params.delete(POSTS_PAGE)
      else params.set(POSTS_PAGE, String(next))
      return params
    })
  }, [setSearchParams])
  const setCommunitiesPage = useCallback((next: number) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      if (next === 0) params.delete(COMMUNITIES_PAGE)
      else params.set(COMMUNITIES_PAGE, String(next))
      return params
    })
  }, [setSearchParams])

  function clearQuery() {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      params.delete('q')
      params.delete(POSTS_PAGE)
      params.delete(COMMUNITIES_PAGE)
      return params
    })
  }

  function changeView(next: View) {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      if (next === 'all') params.delete('view')
      else params.set('view', next)
      return params
    })
  }

  function changeSort(next: 'new' | 'top') {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      if (next === 'new') params.delete('sort')
      else params.set('sort', next)
      params.delete(COMMUNITIES_PAGE)
      return params
    })
  }

  const searchFilters: CommunityListParams = {
    name: queryName || undefined,
    sort,
    page: communitiesPage,
    size: COMMUNITIES_PAGE_SIZE,
  }
  // Both pairs stay mounted: the search pair is disabled without a query, and the discovery pair is ready
  // before the empty search settles, so falling back to it never flashes skeletons or flips a state flag.
  const searchPosts = usePosts({ q: queryName || undefined, page: postsPage, size: POSTS_PAGE_SIZE }, searching)
  const searchCommunities = useCommunityDirectory(searchFilters, searching)
  const discoveryPosts = usePosts({ page: postsPage, size: POSTS_PAGE_SIZE })
  const discoveryCommunities = useCommunityDirectory({ sort, page: communitiesPage, size: COMMUNITIES_PAGE_SIZE })

  const searchEmpty = searching
    && !searchPosts.isPending && !searchCommunities.isPending
    && !searchPosts.error && !searchCommunities.error
    && searchPosts.data?.content.length === 0
    && searchCommunities.data?.content.length === 0
  const discovery = !searching || searchEmpty

  const posts = discovery ? discoveryPosts : searchPosts
  const communities = discovery ? discoveryCommunities : searchCommunities
  // Each list moves back on its own when a filter change leaves it past its last page.
  useStayOnExistingPage(postsPage, posts.data?.totalPages, posts.isPlaceholderData, setPostsPage)
  useStayOnExistingPage(communitiesPage, communities.data?.totalPages, communities.isPlaceholderData, setCommunitiesPage)

  const postResults = posts.data?.content ?? []
  const communityResults = communities.data?.content ?? []

  return (
    <section aria-labelledby="discover-title" className="grid gap-5">
      <header>
        <h1 id="discover-title" className="text-h2">Discover</h1>
        {queryName ? (
          <p className="mt-1 text-small text-muted">
            {discovery ? `No results for "${queryName}". Explore posts and communities below.` : `Results for "${queryName}".`}{' '}
            <button type="button" onClick={clearQuery} className="cursor-pointer font-medium text-accent underline underline-offset-2">
              Clear
            </button>
          </p>
        ) : (
          <p className="mt-1 text-small text-muted">Explore posts and communities.</p>
        )}

        <div role="group" aria-label="Show" className="mt-3 flex flex-wrap gap-1">
          {VIEWS.map(option => (
            <button
              key={option.value}
              type="button"
              aria-pressed={view === option.value}
              onClick={() => changeView(option.value)}
              className={cn(
                'cursor-pointer rounded-btn px-3 py-1.5 text-small font-medium',
                view === option.value ? 'bg-surface text-ink' : 'text-muted hover:bg-surface hover:text-ink',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      {(view === 'all' || view === 'posts') && (
        <section aria-labelledby="discover-posts-title" className="grid gap-3">
          <h2 id="discover-posts-title" className="text-h3">Posts</h2>
          {posts.isPending ? (
            <div aria-busy="true" aria-label="Loading posts" className="grid gap-3">
              <PostCardSkeleton />
              <PostCardSkeleton />
              <PostCardSkeleton />
            </div>
          ) : posts.error ? (
            <div className="rounded-lg border border-line bg-bg px-card-pad py-10 text-center">
              <h3 className="text-h3">Couldn't load posts</h3>
              <p className="mt-2 text-small text-muted">Check your connection and try again.</p>
              <button type="button" onClick={() => void posts.refetch()} className="mt-4 cursor-pointer text-small font-medium text-accent underline underline-offset-2">
                Try again
              </button>
            </div>
          ) : postResults.length === 0 ? (
            <p className="rounded-lg border border-line bg-bg px-card-pad py-10 text-center text-small text-muted">No posts found.</p>
          ) : (
            <>
              <ul aria-label="Search results: posts" aria-busy={posts.isPlaceholderData} className="grid gap-3">
                {postResults.map(post => (
                  <li key={post.id}>
                    <PostCard post={post} />
                  </li>
                ))}
              </ul>
              <Pagination
                page={postsPage}
                totalPages={posts.data?.totalPages ?? 0}
                totalElements={posts.data?.totalElements}
                itemLabel="posts"
                label="Posts pages"
                onChange={setPostsPage}
              />
            </>
          )}
        </section>
      )}

      {(view === 'all' || view === 'communities') && (
        <section aria-labelledby="discover-communities-title" className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="discover-communities-title" className="text-h3">Communities</h2>
            <Select
              label="Sort communities"
              id="community-sort"
              variant="text"
              value={sort}
              options={SORT_OPTIONS}
              onChange={changeSort}
            />
          </div>
          {communities.isPending ? (
            <div aria-busy="true" aria-label="Loading communities" className="grid gap-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-line bg-bg p-card-pad">
                  <span className="size-7 animate-pulse rounded-full bg-surface" />
                  <span className="h-3 w-40 animate-pulse rounded-sm bg-surface" />
                </div>
              ))}
            </div>
          ) : communities.error ? (
            <div className="rounded-lg border border-line bg-bg px-card-pad py-10 text-center">
              <h3 className="text-h3">Couldn't load communities</h3>
              <p className="mt-2 text-small text-muted">Check your connection and try again.</p>
              <button type="button" onClick={() => void communities.refetch()} className="mt-4 cursor-pointer text-small font-medium text-accent underline underline-offset-2">
                Try again
              </button>
            </div>
          ) : communityResults.length === 0 ? (
            <p className="rounded-lg border border-line bg-bg px-card-pad py-10 text-center text-small text-muted">No communities found.</p>
          ) : (
            <>
              <ul aria-label="Search results: communities" aria-busy={communities.isPlaceholderData} className="grid gap-3">
                {communityResults.map(community => (
                  <CommunityListItem key={community.name} community={community} />
                ))}
              </ul>
              <Pagination
                page={communitiesPage}
                totalPages={communities.data?.totalPages ?? 0}
                totalElements={communities.data?.totalElements}
                itemLabel="communities"
                label="Communities pages"
                onChange={setCommunitiesPage}
              />
            </>
          )}
        </section>
      )}
    </section>
  )
}

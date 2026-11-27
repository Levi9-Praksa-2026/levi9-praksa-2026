import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { CommunityListItem } from '@/features/communities/CommunityListItem'
import { useCommunityDirectory } from '@/features/communities/hooks'
import type { CommunityListParams } from '@/shared/api/contracts/communities'
import { Pagination } from '@/shared/ui/Pagination'
import { Select, type SelectOption } from '@/shared/ui/Select'

const PAGE_SIZE = 10
const SORT_OPTIONS: readonly SelectOption<'new' | 'top'>[] = [
  { value: 'new', label: 'Newest' },
  { value: 'top', label: 'Most members' },
]

/** Read a page number from the URL; anything invalid means the first page. */
function pageFromParams(params: URLSearchParams): number {
  const raw = params.get('page')
  if (raw === null) return 0
  const value = Number(raw)
  return Number.isInteger(value) && value >= 0 ? value : 0
}

/**
 * `/communities`: the directory the header search lands on. The name typed there, sort and page all
 * live in the URL, so a filtered view can be shared and survives back/forward.
 */
export function CommunitiesPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const sort = searchParams.get('sort') === 'top' ? 'top' : 'new'
  const page = pageFromParams(searchParams)
  const queryName = (searchParams.get('q') ?? '').trim()

  const setPage = useCallback((next: number) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      if (next === 0) params.delete('page')
      else params.set('page', String(next))
      return params
    })
  }, [setSearchParams])

  function clearQuery() {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      params.delete('q')
      params.delete('page')
      return params
    })
  }

  function changeSort(next: 'new' | 'top') {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      if (next === 'new') params.delete('sort')
      else params.set('sort', next)
      params.delete('page')
      return params
    })
  }

  const filters: CommunityListParams = {
    name: queryName || undefined,
    sort,
    page,
    size: PAGE_SIZE,
  }
  const { data, error, isPending, refetch } = useCommunityDirectory(filters)

  const totalPages = data?.totalPages ?? 0
  // A filter change can leave us past the last page; move back to the end of the new result set.
  useEffect(() => {
    if (data && totalPages > 0 && page >= totalPages) setPage(totalPages - 1)
  }, [data, totalPages, page, setPage])

  const results = data?.content ?? []

  return (
    <section aria-labelledby="communities-title" className="grid gap-5">
      <header>
        <h1 id="communities-title" className="text-h2">Communities</h1>
        {queryName ? (
          <p className="mt-1 text-small text-muted">
            Results for "{queryName}".{' '}
            <button type="button" onClick={clearQuery} className="cursor-pointer font-medium text-accent underline underline-offset-2">
              Clear
            </button>
          </p>
        ) : (
          <p className="mt-1 text-small text-muted">Explore communities by name with the search in the header.</p>
        )}

        {/* A quiet filter under the heading, like a search results toolbar. */}
        <div className="mt-3">
          <Select
            label="Sort communities"
            id="community-sort"
            variant="text"
            value={sort}
            options={SORT_OPTIONS}
            onChange={changeSort}
          />
        </div>
      </header>

      {isPending ? (
        <div aria-busy="true" aria-label="Loading communities" className="grid gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-line bg-bg p-card-pad">
              <span className="size-7 animate-pulse rounded-full bg-surface" />
              <span className="h-3 w-40 animate-pulse rounded-sm bg-surface" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-line bg-bg px-card-pad py-10 text-center">
          <h2 className="text-h3">Couldn't load communities</h2>
          <p className="mt-2 text-small text-muted">Check your connection and try again.</p>
          <button type="button" onClick={() => void refetch()} className="mt-4 cursor-pointer text-small font-medium text-accent underline underline-offset-2">
            Try again
          </button>
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-lg border border-line bg-bg px-card-pad py-10 text-center">
          <p className="text-small text-muted">No communities found.</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {results.map(community => (
            <CommunityListItem key={community.name} community={community} />
          ))}
        </ul>
      )}

      {data && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalElements={data.totalElements}
          itemLabel="communities"
          onChange={setPage}
        />
      )}
    </section>
  )
}

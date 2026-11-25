import { useCallback, useEffect, useRef } from 'react'
import { useNavigationType, useSearchParams } from 'react-router'
import { Search } from 'lucide-react'
import { CommunityListItem } from '@/features/communities/CommunityListItem'
import { useCommunityDirectory } from '@/features/communities/hooks'
import { useCurrentUser } from '@/features/users/useCurrentUser'
import type { CommunityListParams } from '@/shared/api/contracts/communities'
import { isApiError } from '@/shared/api/errors'
import { cn } from '@/shared/lib/cn'
import { useDebouncedState } from '@/shared/hooks/useDebouncedValue'
import { Pagination } from '@/shared/ui/Pagination'
import { Select, type SelectOption } from '@/shared/ui/Select'
import { TextField } from '@/shared/ui/TextField'

const PAGE_SIZE = 5
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
 * `/communities`: the searchable community directory. Name, sort, page and the admin-only inactive
 * toggle live in the URL, so a filtered view can be shared and survives back/forward.
 */
export function CommunitiesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useCurrentUser()

  const isAdmin = user?.roles.includes('ADMIN') ?? false
  const wantsInactive = searchParams.get('inactive') === '1'
  const inactive = wantsInactive && isAdmin
  const sort = searchParams.get('sort') === 'top' ? 'top' : 'new'
  const page = pageFromParams(searchParams)

  const urlName = searchParams.get('q') ?? ''
  const navigationType = useNavigationType()
  const { value: text, debounced: debouncedName, setValue: setText, jump } = useDebouncedState(urlName, 300)
  const queryName = debouncedName.trim()

  // Back/forward makes the URL the source of truth: reset the input *and* the query behind the
  // request at once, instead of waiting out the typing debounce or writing the old query back.
  const lastUrlName = useRef(urlName)
  const skipNextWrite = useRef(false)
  useEffect(() => {
    if (navigationType !== 'POP') {
      // our own query writes are PUSHes: remember where they left the URL
      lastUrlName.current = urlName
      skipNextWrite.current = false
      return
    }
    if (urlName === lastUrlName.current) return
    lastUrlName.current = urlName
    skipNextWrite.current = true
    jump(urlName)
  }, [navigationType, urlName, jump])

  // Typing writes one history entry per settled query, so Back steps between searches, not letters.
  // A shared `?page=2` URL keeps its page because nothing is written on the first render.
  useEffect(() => {
    if (skipNextWrite.current) {
      skipNextWrite.current = false
      return
    }
    if (queryName === urlName) return
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (queryName) next.set('q', queryName)
      else next.delete('q')
      next.delete('page')
      return next
    })
  }, [queryName, urlName, setSearchParams])

  const setPage = useCallback((next: number) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      if (next === 0) params.delete('page')
      else params.set('page', String(next))
      return params
    })
  }, [setSearchParams])

  function changeSort(next: 'new' | 'top') {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      if (next === 'new') params.delete('sort')
      else params.set('sort', next)
      params.delete('page')
      return params
    })
  }

  function toggleInactive() {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      if (params.get('inactive') === '1') params.delete('inactive')
      else params.set('inactive', '1')
      params.delete('page')
      return params
    })
  }

  const filters: CommunityListParams = {
    name: queryName || undefined,
    sort,
    page,
    size: PAGE_SIZE,
    inactive: inactive || undefined,
  }
  // Wait for /api/me before asking for the admin list: roles from the session can arrive late, and
  // sending `inactive` too early would 403 an admin (or leak the toggle to a logged-out URL).
  const { data, error, isPending, refetch } = useCommunityDirectory(filters, !wantsInactive || user !== undefined)

  const totalPages = data?.totalPages ?? 0
  // A filter change can leave us past the last page; move back to the end of the new result set.
  useEffect(() => {
    if (data && totalPages > 0 && page >= totalPages) setPage(totalPages - 1)
  }, [data, totalPages, page, setPage])

  const forbidden = isApiError(error) && error.status === 403
  const noAccess = wantsInactive && !inactive && user !== undefined
  const results = data?.content ?? []

  return (
    <section aria-labelledby="communities-title" className="grid gap-5">
      <header>
        <h1 id="communities-title" className="text-h2">Communities</h1>
        <p className="mt-1 text-small text-muted">Find a community by name.</p>
      </header>

      <div className="rounded-lg border border-line bg-bg p-card-pad">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          {/* flex-1 with no max width: the search grows into the space the admin toggle leaves empty */}
          <TextField
            label="Search communities"
            className="sm:flex-1"
            placeholder="e.g. frontend"
            value={text}
            maxLength={50}
            onChange={event => setText(event.target.value)}
            trailing={<Search className="mx-4 size-4 flex-none text-muted" aria-hidden="true" />}
          />
          <Select
            label="Sort"
            id="community-sort"
            className="w-full sm:w-48"
            value={sort}
            options={SORT_OPTIONS}
            onChange={changeSort}
          />
          {isAdmin && (
            <button
              type="button"
              aria-pressed={inactive}
              onClick={toggleInactive}
              className={cn(
                'h-12 w-full cursor-pointer rounded-md border px-3 text-small font-medium sm:w-auto',
                inactive ? 'border-accent bg-surface text-accent' : 'border-line text-muted hover:text-ink',
              )}
            >
              Inactive
            </button>
          )}
        </div>
      </div>

      {isPending ? (
        <div aria-busy="true" aria-label="Loading communities" className="grid gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-line bg-bg p-card-pad">
              <span className="size-7 animate-pulse rounded-full bg-surface" />
              <span className="h-3 w-40 animate-pulse rounded-sm bg-surface" />
            </div>
          ))}
        </div>
      ) : forbidden || noAccess ? (
        <div className="rounded-lg border border-line bg-bg px-card-pad py-10 text-center">
          <h2 className="text-h3">Admins only</h2>
          <p className="mt-2 text-small text-muted">The inactive list is available to admins.</p>
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
            <CommunityListItem key={community.name} community={community} inactive={inactive} />
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

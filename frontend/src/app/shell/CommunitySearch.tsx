import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { Loader2, Search, Users, X } from 'lucide-react'
import { CommunityAvatar } from '@/features/communities/CommunityAvatar'
import { useCommunitySearch } from '@/features/communities/hooks'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'

const members = (n: number) => `${n} member${n === 1 ? '' : 's'}`

/**
 * The top bar's search: a combobox over community names. Typing lists matches after a short pause;
 * arrow keys move through them, clicking an option opens that community, Enter goes to the directory
 * filtered by the typed name, Escape closes the list (or clears the box), and a screen reader hears
 * how many were found.
 */
export function CommunitySearch({ className }: { className?: string }) {
  const navigate = useNavigate()
  const id = useId()
  const listId = `${id}-list`
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const { data, error, isLoading: loading } = useCommunitySearch(query)
  const results = data ?? []

  const hasQuery = query.trim() !== ''
  const showList = open && hasQuery
  const activeResult = showList && active >= 0 ? results[active] : undefined

  useEffect(() => {
    if (activeResult) {
      listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
    }
  }, [active, activeResult])

  function reset() {
    setQuery('')
    setOpen(false)
    setActive(-1)
    inputRef.current?.blur()
  }

  function go(name: string) {
    reset()
    navigate(routes.community(name))
  }

  /** Enter is a search, not a pick: it shows every community matching the whole typed name. */
  function explore() {
    const target = routes.communitiesSearch(query)
    reset()
    navigate(target)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      if (!results.length) return
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive(a => (a + step + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      explore()
    } else if (e.key === 'Escape') {
      if (showList) setOpen(false)
      else setQuery('')
      setActive(-1)
    }
  }

  // what a screen reader hears once a search has settled
  const found = results.length === 1 ? '1 community found' : `${results.length} communities found`
  const status = !hasQuery || loading ? '' : error ? 'Search failed' : `${results.length ? found : 'No communities found'}. Press Enter to see all results`
  const message = loading ? (results.length ? null : 'Searching…') : error ? 'Search failed. Try again in a moment.' : results.length ? null : 'No communities found'

  return (
    <div
      className={cn('relative', className)}
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
    >
      <label htmlFor={`${id}-input`} className="sr-only">Search communities</label>
      <div className="flex h-10 items-center gap-2 rounded-btn border border-line-strong bg-bg px-4 text-muted focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
        {loading ? <Loader2 className="size-4 flex-none animate-spin" aria-hidden="true" /> : <Search className="size-4 flex-none" aria-hidden="true" />}
        <input
          ref={inputRef}
          id={`${id}-input`}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeResult ? `${id}-option-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Search communities"
          maxLength={50}
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-small text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            className="-mr-2 grid size-8 flex-none cursor-pointer place-items-center rounded-full hover:bg-surface hover:text-ink"
            aria-label="Clear search"
            onClick={() => {
              setQuery('')
              setActive(-1)
              inputRef.current?.focus()
            }}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div
        className={cn(
          'absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-md border border-line bg-bg shadow-[0_16px_40px_-16px_rgb(20_24_51/0.25)]',
          !showList && 'hidden',
        )}
      >
        <div ref={listRef} id={listId} role="listbox" aria-label="Communities" className="max-h-80 overflow-y-auto py-1.5">
          {results.map((c, i) => (
            // the options are worked from the input's keys (aria-activedescendant), so a click is all they need
            // oxlint-disable-next-line jsx-a11y/click-events-have-key-events
            <div
              key={c.name}
              id={`${id}-option-${i}`}
              role="option"
              tabIndex={-1}
              aria-selected={i === active}
              className="flex cursor-pointer items-center gap-3 px-4 py-2.5 aria-selected:bg-surface hover:bg-surface"
              onMouseDown={e => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(c.name)}
            >
              <CommunityAvatar name={c.name} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-small font-medium text-ink">l/{c.name}</span>
                <span className="mt-0.5 flex items-center gap-1 text-label text-muted">
                  <Users className="size-3" aria-hidden="true" />
                  {members(c.memberCount)}
                </span>
              </span>
            </div>
          ))}
        </div>
        {message && <p className="px-4 pt-2 pb-4 text-center text-small text-muted">{message}</p>}
      </div>
      <p className="sr-only" role="status">{status}</p>
    </div>
  )
}

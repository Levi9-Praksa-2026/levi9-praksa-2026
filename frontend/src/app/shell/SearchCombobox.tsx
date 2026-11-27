import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { Compass, FileText, Loader2, Search, Users, X } from 'lucide-react'
import { CommunityAvatar } from '@/features/communities/CommunityAvatar'
import { useCommunitySearch } from '@/features/communities/hooks'
import { usePostSearch } from '@/features/posts/hooks'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { buildSuggestionSections, suggestionLabel, suggestionTarget, type Suggestion } from './suggestions'

const SUGGESTION_LIMIT = 4
const members = (n: number) => `${n} member${n === 1 ? '' : 's'}`

/**
 * The top bar's search: a combobox over post titles and community names. Typing lists matches after a short
 * pause, posts first and communities second; arrow keys move through both groups, clicking an option opens
 * it, Enter goes to the search page (or to discovery when nothing matched), Escape closes the list (or clears
 * the box), and a screen reader hears how many of each kind were found.
 */
export function SearchCombobox({ className }: { className?: string }) {
  const navigate = useNavigate()
  const id = useId()
  const listId = `${id}-list`
  const inputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<Array<HTMLDivElement | null>>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const posts = usePostSearch(query, SUGGESTION_LIMIT)
  const communities = useCommunitySearch(query, SUGGESTION_LIMIT)
  const loading = posts.isLoading || communities.isLoading
  const error = posts.error ?? communities.error

  const hasQuery = query.trim() !== ''
  const showList = open && hasQuery

  const postResults = posts.data ?? []
  const communityResults = communities.data ?? []
  const sections = buildSuggestionSections(postResults, communityResults, id, !loading && !error)
  const suggestions = sections.flatMap(section => section.items)
  const activeSuggestion = showList && active >= 0 ? suggestions[active] : undefined

  useEffect(() => {
    if (activeSuggestion) optionRefs.current[active]?.scrollIntoView({ block: 'nearest' })
  }, [active, activeSuggestion])

  function reset() {
    setQuery('')
    setOpen(false)
    setActive(-1)
    inputRef.current?.blur()
  }

  function pick(suggestion: Suggestion) {
    const target = suggestionTarget(suggestion)
    reset()
    navigate(target)
  }

  /** Enter is a search, not a pick: it shows everything matching the whole typed name, or discovery if none. */
  function explore() {
    const target = routes.communitiesSearch(query)
    reset()
    navigate(target)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      if (!suggestions.length) return
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive(a => (a + step + suggestions.length) % suggestions.length)
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
  const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`
  const found = [count(postResults.length, 'post'), count(communityResults.length, 'community')].join(' and ')
  const status = !hasQuery || loading ? '' : error ? 'Search failed'
    : suggestions.length ? `${found}. Press Enter to see all results`
      : 'No matches. Press Enter to explore posts and communities'
  const message = loading ? (suggestions.length ? null : 'Searching…') : error ? 'Search failed. Try again in a moment.' : null

  return (
    <div
      className={cn('relative', className)}
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
    >
      <label htmlFor={`${id}-input`} className="sr-only">Search posts and communities</label>
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
          aria-activedescendant={activeSuggestion?.id}
          autoComplete="off"
          spellCheck={false}
          placeholder="Search posts and communities"
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
        <div id={listId} role="listbox" aria-label="Search results" className="max-h-80 overflow-y-auto py-1.5">
          {sections.map(section => (
            <div key={section.label} role="group" aria-label={section.label}>
              <p aria-hidden="true" className="px-4 pt-1.5 pb-1 text-label font-semibold tracking-[0.08em] text-muted uppercase">{section.label}</p>
              {section.items.map((suggestion, i) => {
                const index = section.start + i
                return (
                  // the options are worked from the input's keys (aria-activedescendant), so a click is all they need
                  // oxlint-disable-next-line jsx-a11y/click-events-have-key-events
                  <div
                    key={suggestion.id}
                    id={suggestion.id}
                    ref={el => { optionRefs.current[index] = el }}
                    role="option"
                    tabIndex={-1}
                    aria-selected={index === active}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 px-4 py-2.5 aria-selected:bg-surface hover:bg-surface',
                      suggestion.kind === 'explore' && 'text-accent',
                    )}
                    onMouseDown={e => e.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => pick(suggestion)}
                  >
                    {suggestion.kind === 'post' ? (
                      <>
                        <span className="grid size-7 flex-none place-items-center rounded-full bg-surface">
                          <FileText className="size-3.5 text-muted" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-small font-medium text-ink">{suggestionLabel(suggestion)}</span>
                          <span className="mt-0.5 block truncate text-label text-muted">
                            {suggestion.post.communityName ? `l/${suggestion.post.communityName}` : suggestion.post.authorUsername}
                          </span>
                        </span>
                      </>
                    ) : suggestion.kind === 'community' ? (
                      <>
                        <CommunityAvatar name={suggestion.community.name} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-small font-medium text-ink">{suggestionLabel(suggestion)}</span>
                          <span className="mt-0.5 flex items-center gap-1 text-label text-muted">
                            <Users className="size-3" aria-hidden="true" />
                            {members(suggestion.community.memberCount)}
                          </span>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="grid size-7 flex-none place-items-center rounded-full bg-surface">
                          <Compass className="size-3.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-small font-medium text-accent">{suggestionLabel(suggestion)}</span>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        {message && <p className="px-4 pt-2 pb-4 text-center text-small text-muted">{message}</p>}
      </div>
      <p className="sr-only" role="status">{status}</p>
    </div>
  )
}

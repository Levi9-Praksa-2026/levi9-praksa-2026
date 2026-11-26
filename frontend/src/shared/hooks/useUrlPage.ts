import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/** Read a page number from the URL; anything invalid means the first page. */
export function pageFromParams(params: URLSearchParams): number {
  const value = Number(params.get('page') ?? 0)
  return Number.isInteger(value) && value >= 0 ? value : 0
}

/**
 * A list's page, kept in the URL as `?page=` (counted from 0, like the backend; the first page has none), so it
 * survives back/forward and reload and can be shared. Other query parameters are kept.
 *
 * @param afterChange runs after a page change, e.g. to scroll back to the top of the list
 */
export function useUrlPage(afterChange?: () => void): [page: number, setPage: (page: number) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const setPage = useCallback((next: number) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      if (next === 0) params.delete('page')
      else params.set('page', String(next))
      return params
    })
    afterChange?.()
  }, [setSearchParams, afterChange])
  return [pageFromParams(searchParams), setPage]
}

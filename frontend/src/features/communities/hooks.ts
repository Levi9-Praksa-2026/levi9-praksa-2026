import { getCommunity, listCommunities } from '@/shared/api/communities'
import { useAsyncData } from '@/shared/hooks/useAsyncData'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'

/** The communities the user joined, for the sidebar. Nothing is loaded while logged out (userId null). */
export function useMyCommunities(userId: number | null) {
  return useAsyncData(userId === null ? null : `my-communities:${userId}`, () =>
    listCommunities({ member: 'me', sort: 'new', size: 100 }).then(page => page.content),
  )
}

/** Communities whose name contains what was typed: waits for a 300 ms pause, at most `limit` results. */
export function useCommunitySearch(query: string, limit = 8) {
  const settled = useDebouncedValue(query.trim(), 300)
  const typing = settled !== query.trim()
  const result = useAsyncData(settled ? `community-search:${settled}` : null, () =>
    listCommunities({ name: settled, sort: 'top', size: limit }).then(page => page.content),
  )
  return { ...result, loading: result.loading || (typing && query.trim() !== ''), query: settled }
}

/** One community by name, for its page. */
export function useCommunity(name: string) {
  return useAsyncData(`community:${name.toLowerCase()}`, () => getCommunity(name))
}

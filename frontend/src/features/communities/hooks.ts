import { useQuery } from '@tanstack/react-query'
import { getCommunity, listCommunities } from '@/shared/api/communities'
import type { CommunityListParams } from '@/shared/api/contracts/communities'
import { queryKeys } from '@/shared/api/queryKeys'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'

/** The communities the user joined, for the sidebar. Nothing is loaded while logged out (userId null). */
export function useMyCommunities(userId: number | null) {
  return useQuery({
    queryKey: queryKeys.communities.mine(userId ?? 0),
    queryFn: () => listCommunities({ member: 'me', sort: 'new', size: 100 }).then(page => page.content),
    enabled: userId !== null,
  })
}

/** The directory's results, including the page metadata. */
export function useCommunityDirectory(filters: CommunityListParams) {
  return useQuery({
    queryKey: queryKeys.communities.list(filters),
    queryFn: () => listCommunities(filters),
  })
}

/** Communities whose name contains what was typed: waits for a 300 ms pause, at most `limit` results. */
export function useCommunitySearch(query: string, limit = 8) {
  const settled = useDebouncedValue(query.trim(), 300)
  const typing = settled !== query.trim()
  const result = useQuery({
    queryKey: queryKeys.communities.search(settled, limit),
    queryFn: () => listCommunities({ name: settled, sort: 'top', size: limit }).then(page => page.content),
    enabled: settled !== '',
  })
  return {
    // while still typing, the last answer is for an older query: show none of it, so Enter can't open a stale result
    data: typing ? undefined : result.data,
    error: typing ? null : result.error,
    // still typing counts as loading, so the list never says "No communities found" mid-word
    isLoading: query.trim() !== '' && (typing || result.isLoading),
    query: settled,
  }
}

/** One community by name, for its page. */
export function useCommunity(name: string) {
  return useQuery({
    queryKey: queryKeys.communities.detail(name),
    queryFn: () => getCommunity(name),
  })
}

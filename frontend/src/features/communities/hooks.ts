import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getCommunity, getCommunityMembership, listCommunities } from '@/shared/api/communities'
import type { PageResponse } from '@/shared/api/contracts/common'
import type { CommunityListParams, CommunityResponse } from '@/shared/api/contracts/communities'
import { queryKeys } from '@/shared/api/queryKeys'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'

const INACTIVE_PAGE_SIZE = 100

/** The communities the user joined, for the sidebar. Nothing is loaded while logged out (userId null). */
export function useMyCommunities(userId: number | null) {
  return useQuery({
    queryKey: queryKeys.communities.mine(userId ?? 0),
    queryFn: () => listCommunities({ member: 'me', sort: 'new', size: 100 }).then(page => page.content),
    enabled: userId !== null,
  })
}

/** The directory's results, including the page metadata. */
export function useCommunityDirectory(filters: CommunityListParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.communities.list(filters),
    queryFn: () => listCommunities(filters),
    placeholderData: keepPreviousData,
    enabled,
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

/** Whether the signed-in user has joined this community. Nothing is asked while logged out. */
export function useCommunityMembership(name: string, userId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.communities.membership(name, userId ?? 0),
    queryFn: () => getCommunityMembership(name),
    enabled: userId !== undefined,
  })
}

/** One community by name, for its page. */
export function useCommunity(name: string) {
  return useQuery({
    queryKey: queryKeys.communities.detail(name),
    queryFn: () => getCommunity(name),
  })
}

/**
 * ADMIN only: find a shut-down community by exact name. The admin list's `name` filter is "contains",
 * so a page full of newer matches can hide the one we want: walk every page until it turns up.
 * `null` means no inactive community has that name.
 */
export async function findInactiveCommunity(
  name: string,
  list: (params: CommunityListParams) => Promise<PageResponse<CommunityResponse>> = listCommunities,
): Promise<CommunityResponse | null> {
  const wanted = name.toLowerCase()
  for (let page = 0; ; page++) {
    const result = await list({ inactive: true, name, page, size: INACTIVE_PAGE_SIZE })
    const match = result.content.find(c => c.name.toLowerCase() === wanted)
    if (match) return match
    if (page + 1 >= result.totalPages || result.content.length === 0) return null
  }
}

/**
 * ADMIN only: a shut-down community by name. The public detail endpoint 404s for inactive communities,
 * so this looks in the admin list instead and keeps only an exact match (the filter is "contains").
 */
export function useInactiveCommunity(name: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.communities.inactive(name),
    queryFn: () => findInactiveCommunity(name),
    enabled,
  })
}

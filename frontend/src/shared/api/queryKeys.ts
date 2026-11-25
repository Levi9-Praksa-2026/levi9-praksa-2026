import type { CommunityListParams } from './contracts/communities'
import type { PostListParams } from './contracts/posts'

/**
 * Every TanStack Query key in one place. A key names a piece of server data, and the cache stores one
 * answer per key; keys are arrays so a prefix covers a whole family (`queryKeys.communities.all`
 * matches every community query when they all need loading again).
 */
export const queryKeys = {
  /** Who is logged in. */
  me: ['me'] as const,
  communities: {
    all: ['communities'] as const,
    /** The sidebar's list: one per user, so switching accounts never shows the last one's. */
    mine: (userId: number) => ['communities', 'mine', userId] as const,
    search: (name: string, limit: number) => ['communities', 'search', name, limit] as const,
    /** The search page: every filter is part of the key, so results never get mixed up. */
    list: (filters: CommunityListParams) => ['communities', 'list', filters] as const,
    /** Names are unique ignoring case, so `Frontend` and `frontend` share one entry. */
    detail: (name: string) => ['communities', 'detail', name.toLowerCase()] as const,
  },
  posts: {
    all: ['posts'] as const,
    /** One feed page: the community, search and page are all part of the key. */
    list: (params: PostListParams) => ['posts', 'list', params] as const,
    detail: (id: number) => ['posts', 'detail', id] as const,
    /** One page of a post's comments, under the post so removing the post can clear both. */
    comments: (postId: number, page: number) => ['posts', 'detail', postId, 'comments', page] as const,
  },
}

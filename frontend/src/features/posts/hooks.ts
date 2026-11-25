import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { PostListParams } from '@/shared/api/contracts/posts'
import { listPosts } from '@/shared/api/posts'
import { queryKeys } from '@/shared/api/queryKeys'

/**
 * One page of posts, newest first. While the next page loads, the current one stays on screen
 * (`isPlaceholderData`), so paging doesn't flash back to skeletons.
 */
export function usePosts(params: PostListParams) {
  return useQuery({
    queryKey: queryKeys.posts.list(params),
    queryFn: () => listPosts(params),
    placeholderData: keepPreviousData,
  })
}

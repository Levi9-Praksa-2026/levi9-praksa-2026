import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { PostListParams } from '@/shared/api/contracts/posts'
import { getPost, listComments, listPosts } from '@/shared/api/posts'
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

/** One post, for its own page. */
export function usePost(id: number) {
  return useQuery({ queryKey: queryKeys.posts.detail(id), queryFn: () => getPost(id) })
}

/** One page of a post's comments, newest first; the current page stays on screen while the next loads. */
export function useComments(postId: number, page: number, size = 20) {
  return useQuery({
    queryKey: queryKeys.posts.comments(postId, page),
    queryFn: () => listComments(postId, { page, size }),
    placeholderData: keepPreviousData,
  })
}

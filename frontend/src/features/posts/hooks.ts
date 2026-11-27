import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreatePostRequest, PostListParams, UpdatePostRequest } from '@/shared/api/contracts/posts'
import { createPost, getPost, listComments, listPosts, removePost, updatePost } from '@/shared/api/posts'
import { queryKeys } from '@/shared/api/queryKeys'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'

/**
 * One page of posts, newest first. While the next page loads, the current one stays on screen
 * (`isPlaceholderData`), so paging doesn't flash back to skeletons.
 */
export function usePosts(params: PostListParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.posts.list(params),
    queryFn: () => listPosts(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** Posts whose title contains what was typed: waits for a 300 ms pause, at most `limit` results. */
export function usePostSearch(query: string, limit = 4) {
  const settled = useDebouncedValue(query.trim(), 300)
  const typing = settled !== query.trim()
  const result = useQuery({
    queryKey: queryKeys.posts.search(settled, limit),
    queryFn: () => listPosts({ q: settled, size: limit }).then(page => page.content),
    enabled: settled !== '',
  })
  return {
    // while still typing, the last answer is for an older query: show none of it, so Enter can't open a stale result
    data: typing ? undefined : result.data,
    error: typing ? null : result.error,
    isLoading: query.trim() !== '' && (typing || result.isLoading),
    query: settled,
  }
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

/** Saves a new title and content. The post page shows the answer at once; feeds load again when next shown. */
export function useEditPost(postId: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (request: UpdatePostRequest) => updatePost(postId, request),
    onSuccess: post => {
      client.setQueryData(queryKeys.posts.detail(postId), post)
      void client.invalidateQueries({ queryKey: ['posts', 'list'] })
    },
  })
}

/** Removes the post (soft). Its page and comments leave the cache; feeds load again without it. */
export function useRemovePost(postId: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => removePost(postId),
    onSuccess: () => {
      client.removeQueries({ queryKey: queryKeys.posts.detail(postId) })
      void client.invalidateQueries({ queryKey: ['posts', 'list'] })
    },
  })
}

/** Creates a post with its images. The new post goes into the cache for its page; feeds load again with it. */
export function useCreatePost() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ request, images }: { request: CreatePostRequest; images: readonly File[] }) => createPost(request, images),
    onSuccess: post => {
      client.setQueryData(queryKeys.posts.detail(post.id), post)
      void client.invalidateQueries({ queryKey: ['posts', 'list'] })
    },
  })
}

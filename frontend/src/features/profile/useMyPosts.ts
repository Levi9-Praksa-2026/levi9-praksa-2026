import { useQuery } from '@tanstack/react-query'
import { listPosts } from '@/shared/api/posts'
import { queryKeys } from '@/shared/api/queryKeys'

const RECENT_POSTS = 5

/** The logged-in user's newest posts, for the profile. Nothing is loaded until the account id is known. */
export function useMyPosts(authorId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.posts.byAuthor(authorId ?? 0, RECENT_POSTS),
    queryFn: () => listPosts({ authorId, size: RECENT_POSTS }).then(page => page.content),
    enabled: authorId !== undefined,
  })
}

import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/queryKeys'

/*
  The cache every screen reads server data from, and the rules for when a failed request is tried
  again. One client for the whole app, made once in main.tsx.
*/

/** The gateway's 503 (with Retry-After) means it couldn't refresh the token just now: the user is still logged in. */
const MAX_WAITS_FOR_GATEWAY = 3

/**
 * Whether to try a failed query again. A 4xx is an answer, not an accident: asking again gives the same
 * one (a 401 stays a 401). A 503 is the gateway asking us to wait, so we do, a few times. Anything else
 * (a 500, the network) gets one more try.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error)) {
    if (error.status === 503) return failureCount < MAX_WAITS_FOR_GATEWAY
    if (error.status < 500) return false
  }
  return failureCount < 1
}

/** How long to wait before that try: what Retry-After says, or 1 s, 2 s, 4 s… up to 8 s. */
export function retryDelay(attempt: number, error: unknown): number {
  if (isApiError(error) && error.retryAfter !== undefined) return error.retryAfter * 1000
  return Math.min(1000 * 2 ** attempt, 8000)
}

export function createQueryClient(): QueryClient {
  // A 401 from anything but "me" means the session ended while the page was open: ask "me" again, so
  // the top bar and every screen switch to logged out at once.
  const onError = (error: unknown, key?: readonly unknown[]) => {
    if (!isApiError(error) || error.status !== 401) return
    if (key?.[0] === queryKeys.me[0]) return
    void client.invalidateQueries({ queryKey: queryKeys.me })
  }

  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: (error, query) => onError(error, query.queryKey) }),
    mutationCache: new MutationCache({ onError: error => onError(error) }),
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay,
        // an answer counts as fresh for 30 s: moving between screens doesn't ask again for what was just loaded
        staleTime: 30_000,
      },
      // writes are never repeated on their own: a second "create" could create twice
      mutations: { retry: false },
    },
  })
  return client
}

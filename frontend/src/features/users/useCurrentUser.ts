import { useQuery } from '@tanstack/react-query'
import { getMe } from '@/shared/api/auth'
import type { MeResponse } from '@/shared/api/contracts/auth'
import { isApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/queryKeys'

export interface CurrentUser {
  /** The logged-in user, or null when logged out. Undefined while it is still being asked. */
  user: MeResponse | null | undefined
  loading: boolean
}

/**
 * Who is logged in, from the gateway's session (`GET /api/me`). A 401 is not an error here: it means
 * logged out. Any other failure (the gateway is down) is shown as logged out too, so the page still works.
 */
export function useCurrentUser(): CurrentUser {
  const { data, error, isPending } = useQuery({ queryKey: queryKeys.me, queryFn: getMe })
  if (isPending) return { user: undefined, loading: true }
  if (isApiError(error) && error.status === 401) return { user: null, loading: false }
  return { user: data ?? null, loading: false }
}

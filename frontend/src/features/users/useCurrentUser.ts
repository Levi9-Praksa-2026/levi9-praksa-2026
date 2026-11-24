import { useQuery } from '@tanstack/react-query'
import { getMe } from '@/shared/api/users'
import type { UserProfileResponse } from '@/shared/api/contracts/users'
import { isApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/queryKeys'

export interface CurrentUser {
  /** The logged-in user, or null when logged out. Undefined while it is still being asked. */
  user: UserProfileResponse | null | undefined
  loading: boolean
}

/** Who is logged in. A 401 is not an error here: it means logged out. */
export function useCurrentUser(): CurrentUser {
  const { data, error, isPending } = useQuery({ queryKey: queryKeys.me, queryFn: getMe })
  if (isPending) return { user: undefined, loading: true }
  if (isApiError(error) && error.status === 401) return { user: null, loading: false }
  return { user: data ?? null, loading: false }
}

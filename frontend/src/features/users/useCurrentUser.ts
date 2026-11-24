import { getMe } from '@/shared/api/users'
import type { UserProfileResponse } from '@/shared/api/contracts/users'
import { isApiError } from '@/shared/api/errors'
import { useAsyncData } from '@/shared/hooks/useAsyncData'

export interface CurrentUser {
  /** The logged-in user, or null when logged out. Undefined while it is still being asked. */
  user: UserProfileResponse | null | undefined
  loading: boolean
}

/** Who is logged in. A 401 is not an error here: it means logged out. */
export function useCurrentUser(): CurrentUser {
  const { data, error, loading } = useAsyncData('me', getMe)
  if (loading) return { user: undefined, loading }
  if (isApiError(error) && error.status === 401) return { user: null, loading }
  return { user: data ?? null, loading }
}

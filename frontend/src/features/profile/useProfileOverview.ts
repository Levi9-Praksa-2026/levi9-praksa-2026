import { useQuery } from '@tanstack/react-query'
import { getMyProfileOverview } from '@/shared/api/profile'
import { queryKeys } from '@/shared/api/queryKeys'

/** The logged-in user's profile: identity and latest posts. */
export function useProfileOverview() {
  return useQuery({
    queryKey: queryKeys.profile.overview,
    queryFn: getMyProfileOverview,
  })
}

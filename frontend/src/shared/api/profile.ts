import type { ProfileOverviewResponse } from './contracts/profile'
import type { UserProfileResponse } from './contracts/users'
import { http } from './http'

/** A public profile excludes the account's email and other private details. */
export interface PublicUserProfile {
  username: string
  firstName: string
  lastName: string
  createdAt: string
}

export function getPublicUserProfile(username: string): Promise<PublicUserProfile> {
  return http<PublicUserProfile>(`/api/users/public/${encodeURIComponent(username)}`)
}

/*
  Real requests only: no mock store and no seeded people or posts.

  There is no profile overview endpoint yet, so the identity comes from GET /api/users/me and the posts are
  fetched separately with listPosts({ authorId }) (see features/profile/useMyPosts).
*/

/** The real account, narrowed to what the profile shows. */
export function getMyProfileOverview(): Promise<ProfileOverviewResponse> {
  return http<UserProfileResponse>('/api/users/me').then(me => ({
    id: me.id,
    username: me.username,
    firstName: me.firstName,
    lastName: me.lastName,
  }))
}

/** `PATCH /api/users/me`: the real auth-service endpoint. First and last name only; the username never changes. */
export function updateMyName(firstName: string, lastName: string): Promise<UserProfileResponse> {
  return http<UserProfileResponse>('/api/users/me', {
    method: 'PATCH',
    body: { firstName, lastName },
  })
}

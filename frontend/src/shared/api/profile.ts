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
  Real requests only: no mock store and no seeded people, posts or communities.

  There is no profile overview endpoint yet. Until there is one, the identity comes from the real
  GET /api/users/me and recentPosts is deliberately empty: post-service cannot filter posts by author,
  so there is no honest way to fill it from the current API.
*/

/** The real account, with empty lists until a service can answer the whole Overview. */
export function getMyProfileOverview(): Promise<ProfileOverviewResponse> {
  return http<UserProfileResponse>('/api/users/me').then(me => ({
    username: me.username,
    firstName: me.firstName,
    lastName: me.lastName,
    recentPosts: [],
  }))
}

/** `PATCH /api/users/me`: the real auth-service endpoint. First and last name only; the username never changes. */
export function updateMyName(firstName: string, lastName: string): Promise<UserProfileResponse> {
  return http<UserProfileResponse>('/api/users/me', {
    method: 'PATCH',
    body: { firstName, lastName },
  })
}
